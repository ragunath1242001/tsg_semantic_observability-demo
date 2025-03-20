import { afterAll, beforeAll, describe, it, jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EmailService,
  NodemailerConfiguration,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { OfferGrants } from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import { DIDDocument } from "did-resolver";
import {
  exportJWK,
  generateKeyPair,
  GenerateKeyPairResult,
  SignJWT
} from "jose";
import { http, HttpResponse } from "msw";
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
import { DCPHolderService } from "../dcp/holder.service.js";
import { IssuanceService } from "../issuance.service.js";
import { OID4VCIHolderService } from "./holder.service.js";
import { OID4VCIIssuerService } from "./issuer.service.js";

describe("Issuer service", () => {
  let issuerService: OID4VCIIssuerService;
  let issuanceService: IssuanceService;
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
      ],
      email: {
        enabled: false
      }
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

    const didService = moduleRef.get(DidService);
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
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:example.com",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" }
      });

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
          "pre-authorized_code"
        ] ?? ""
      );

      const jwt = await new SignJWT({ nonce: access_token.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt",
          kid: "did:web:example.com#KEY-0"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      expect(
        await issuerService.handleCredentialRequest(access_token.access_token, {
          format: "jwt_vc_json-ld",
          credential_definition: {
            "@context": [],
            type: ["VerifiableCredential", "ExampleCredentialType"]
          },
          proof: {
            proof_type: "jwt",
            jwt: jwt
          }
        })
      ).toBeTruthy();
    });
    it("Create offer without Holder ID", async () => {
      const offer = await issuanceService.createCredentialOffer({
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" }
      });

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
          "pre-authorized_code"
        ] ?? ""
      );

      const jwt = await new SignJWT({ nonce: access_token.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt",
          kid: "did:web:example.com#KEY-0"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      expect(
        await issuerService.handleCredentialRequest(access_token.access_token, {
          format: "jwt_vc_json-ld",
          credential_definition: {
            "@context": [],
            type: ["VerifiableCredential", "ExampleCredentialType"]
          },
          proof: {
            proof_type: "jwt",
            jwt: jwt
          }
        })
      ).toBeTruthy();
    });

    it("Should error without kid in header", async () => {
      const offer = await issuanceService.createCredentialOffer({
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" }
      });

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
          "pre-authorized_code"
        ] ?? ""
      );

      const jwt = await new SignJWT({ nonce: access_token.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      expect(
        issuerService.handleCredentialRequest(access_token.access_token, {
          format: "jwt_vc_json-ld",
          credential_definition: {
            "@context": [],
            type: ["VerifiableCredential", "ExampleCredentialType"]
          },
          proof: {
            proof_type: "jwt",
            jwt: jwt
          }
        })
      ).rejects.toThrow(
        'Only JWTs with "kid" referencing a key described in a DID document are supported'
      );
    });

    it("Should error kid without did in header", async () => {
      const offer = await issuanceService.createCredentialOffer({
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" }
      });

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
          "pre-authorized_code"
        ] ?? ""
      );

      const jwt = await new SignJWT({ nonce: access_token.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt",
          kid: "test1234234"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      expect(
        issuerService.handleCredentialRequest(access_token.access_token, {
          format: "jwt_vc_json-ld",
          credential_definition: {
            "@context": [],
            type: ["VerifiableCredential", "ExampleCredentialType"]
          },
          proof: {
            proof_type: "jwt",
            jwt: jwt
          }
        })
      ).rejects.toThrow('Holder ID test1234234 does not start with "did:"');
    });

    it("Issuer Metadata", async () => {
      const metadata = await issuerService.issuerMetadata();
      expect(metadata.credential_issuer).toBe("https://localhost");
      expect(metadata.credential_endpoint).toBe(
        "http://localhost:3000/api/oid4vci/credential"
      );
      expect(metadata.token_endpoint).toEqual(
        "http://localhost:3000/api/oid4vci/token"
      );
      expect(metadata.credential_configurations_supported).toHaveProperty(
        "ExampleCredentialType"
      );
    });
  });
});
