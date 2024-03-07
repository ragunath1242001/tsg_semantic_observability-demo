import { describe, beforeAll, afterAll, it } from "@jest/globals";
import { IssuerService } from "./issuer.service";
import { TypeOrmTestHelper } from "../utils/testhelper";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Credentials,
  DIDDocuments,
  KeyMaterials,
} from "../model/credentials.dao";
import { CredentialsService } from "../credentials/credentials.service";
import { DidService } from "../did/did.service";
import { DidResolverService } from "../did/did.resolver.service";
import { KeysService } from "../keys/keys.service";
import { PresentationService } from "../presentation/presentation.service";
import { CIAccessToken, CredentialIssuance } from "../model/issuance.dao";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { OfferGrants } from "@libs/dtos";
import {
  GenerateKeyPairResult,
  KeyLike,
  SignJWT,
  exportJWK,
  generateKeyPair,
} from "jose";
import { DIDDocument } from "did-resolver";
import { HolderService } from "./holder.service";

describe("Issuer service", () => {
  let issuerService: IssuerService;
  let holderService: HolderService;
  let server: SetupServer;
  let moduleRef: TestingModule;
  let exampleKey: GenerateKeyPairResult<KeyLike>;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true,
        },
      ],
      contexts: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          issuable: true,
          documentUrl: "https://example.com/context.json",
        },
      ],
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          Credentials,
          DIDDocuments,
          KeyMaterials,
          CredentialIssuance,
          CIAccessToken,
        ]),
        TypeOrmModule.forFeature([
          Credentials,
          DIDDocuments,
          KeyMaterials,
          CredentialIssuance,
          CIAccessToken,
        ]),
      ],
      providers: [
        CredentialsService,
        DidService,
        DidResolverService,
        KeysService,
        PresentationService,
        IssuerService,
        HolderService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();
    issuerService = await moduleRef.get(IssuerService);
    holderService = await moduleRef.get(HolderService);

    const didService = await moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    exampleKey = await generateKeyPair("EdDSA");
    const exampleDid: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/",
      ],
      id: "did:web:example.com",
      verificationMethod: [
        {
          id: "did:web:example.com#KEY-0",
          type: "JsonWebKey2020",
          controller: "did:web:example.com",
          publicKeyJwk: {
            kty: "OKP",
            alg: "EdDSA",
            ...(await exportJWK(exampleKey.publicKey)),
          },
        },
      ],
      assertionMethod: ["did:web:example.com#KEY-0"],
    };

    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json(await didService.getDid());
      }),
      http.get("https://example.com/.well-known/did.json", async () => {
        return HttpResponse.json(exampleDid);
      }),
      http.get("https://example.com/context.json", () => {
        return HttpResponse.json({
          "@context": {
            "@protected": true,
            "@version": 1.1,
            ExampleCredentialType: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              "@id": "example:ExampleCredentialType",
            },
            example: "https://example.dataspac.es/credentials/",
            id: "@id",
            type: "@type",
          },
        });
      })
    );
    server.listen({ onUnhandledRequest: "bypass" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Issuance process", () => {
    it("Create offer", async () => {
      const offer = await issuerService.createCredentialOffer({
        holderId: "did:web:example.com",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" },
      });

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZATION_CODE]?.[
          "pre-authorization_code"
        ] ?? ""
      );

      const jwt = await new SignJWT({ nonce: access_token.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt",
          kid: "did:web:example.com#KEY-0",
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);

      const credential = await issuerService.handleCredentialRequest(
        access_token.access_token,
        {
          format: "jwt_vc_json-ld",
          credential_definition: {
            "@context": [],
            type: ["VerifiableCredential", "ExampleCredentialType"],
          },
          proof: {
            proof_type: "jwt",
            jwt: jwt,
          },
        }
      );
      console.log(JSON.stringify(credential));
    });

    it("Issuer Metadata", async () => {
      console.log(
        JSON.stringify(await issuerService.issuerMetadata(), null, 2)
      );
    });
  });
});
