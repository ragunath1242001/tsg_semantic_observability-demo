import { afterAll, beforeAll, describe, it, jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EmailService,
  NodemailerConfiguration,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  AccessToken,
  CredentialRequest,
  CredentialResponse,
  OfferGrants
} from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import { DIDDocument } from "did-resolver";
import { exportJWK, generateKeyPair, GenerateKeyPairResult } from "jose";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../../config.js";
import { ContextService } from "../../contexts/context.service.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { JSONLDContext } from "../../model/context.dao.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../../model/issuance.dao.js";
import { PresentationService } from "../../presentation/presentation.service.js";
import { DCPHolderService } from "../dcp/holder.service.js";
import { IssuanceService } from "../issuance.service.js";
import { OID4VCIHolderService } from "./holder.service.js";
import { OID4VCIIssuerService } from "./issuer.service.js";

describe("Holder service", () => {
  let issuanceService: IssuanceService;
  let issuerService: OID4VCIIssuerService;
  let holderService: OID4VCIHolderService;
  let server: SetupServer;
  let moduleRef: TestingModule;
  let exampleKey: GenerateKeyPairResult;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true
        }
      ],
      contexts: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          issuable: true,
          documentUrl: "https://example.com/context.json"
        }
      ]
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          CredentialIssuance,
          CIAccessToken,
          JSONLDContext,
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          CredentialIssuance,
          CIAccessToken,
          JSONLDContext,
          DIDLogs
        ])
      ],
      providers: [
        CredentialsService,
        DidService,
        EmailService,
        KeysService,
        SignatureService,
        PresentationService,
        IssuanceService,
        OID4VCIIssuerService,
        OID4VCIHolderService,
        ContextService,
        {
          provide: RootConfig,
          useValue: config
        },
        {
          provide: NodemailerConfiguration,
          useValue: plainToInstance(NodemailerConfiguration, {
            enabled: false
          })
        },
        {
          provide: DCPHolderService,
          useValue: {
            handleCredentialRequest: jest.fn()
          }
        }
      ]
    }).compile();
    issuanceService = await moduleRef.get(IssuanceService);
    issuerService = await moduleRef.get(OID4VCIIssuerService);
    holderService = await moduleRef.get(OID4VCIHolderService);

    const didService = await moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    exampleKey = await generateKeyPair("EdDSA");
    const exampleDid: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/"
      ],
      id: "did:web:example.com",
      verificationMethod: [
        {
          id: "did:web:example.com#KEY-0",
          type: "JsonWebKey2020",
          controller: "did:web:example.com",
          publicKeyJwk: {
            alg: "EdDSA",
            ...(await exportJWK(exampleKey.publicKey)),
            kty: "OKP"
          }
        }
      ],
      assertionMethod: ["did:web:example.com#KEY-0"]
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
              "@id": "example:ExampleCredentialType"
            },
            example: "https://example.dataspac.es/credentials/",
            id: "@id",
            type: "@type"
          }
        });
      }),
      http.get(
        "http://localhost:3000/.well-known/openid-credential-issuer",
        async () => {
          return HttpResponse.json(await issuerService.issuerMetadata());
        }
      ),
      http.post<PathParams, any, AccessToken>(
        "http://localhost:3000/api/oid4vci/token",
        async (ctx) => {
          const data = await ctx.request.formData();
          return HttpResponse.json(
            await issuerService.createAccessToken(
              data.get("pre-authorized_code") as string
            )
          );
        }
      ),
      http.post<PathParams, CredentialRequest, CredentialResponse>(
        "http://localhost:3000/api/oid4vci/credential",
        async (ctx) => {
          const body = await ctx.request.json();
          const authorization = ctx.request.headers.get("Authorization");
          return HttpResponse.json(
            await issuerService.handleCredentialRequest(
              authorization!.substring(7),
              body
            )
          );
        }
      )
    );
    server.listen({ onUnhandledRequest: "bypass" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Issuance process", () => {
    it("Request credential", async () => {
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:localhost" }
      });

      await holderService.requestCredential({
        issuerUrl: "http://localhost:3000",
        preAuthorizedCode:
          offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
            "pre-authorized_code"
          ]
      });

      const credentials = await moduleRef
        .get(CredentialsService)
        .getCredentials();

      console.log(credentials);
    });
    it("Request errros", async () => {
      await expect(
        holderService.requestCredential({
          issuerUrl: "http://localhost:3000"
        } as any)
      ).rejects.toThrow(
        "Either pre-authorized code or access token must be provided"
      );
    });
  });
});
