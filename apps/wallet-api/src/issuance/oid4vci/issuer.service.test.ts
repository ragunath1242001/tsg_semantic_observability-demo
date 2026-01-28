import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EmailService,
  NodemailerConfiguration,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import { OfferGrants, ProofType } from "@tsg-dsp/wallet-dtos";
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
import { afterAll, beforeAll, describe, it, vi } from "vitest";

import { RootConfig } from "../../config.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { IssueConfigurationService } from "../../issue-configurations/issue-configuration.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../../model/issuance.dao.js";
import { IssueConfiguration } from "../../model/issue-configuration.dao.js";
import { ScopeDao } from "../../model/scopes.dao.js";
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
      issueConfigurations: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          documentUrl: "https://example.com/context.json",
          schema: {
            type: "object",
            title: "ExampleCredentialType",
            additionalProperties: true,
            properties: {
              id: {
                type: "string",
                pattern: "^did:web:.*"
              }
            },
            required: ["id"]
          }
        },
        {
          id: "Example",
          credentialType: "ExampleLdpCredentialType",
          documentUrl: "https://example.com/context.json",
          proofType: "ldp"
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
          IssueConfiguration,
          DIDLogs,
          ScopeDao
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          CredentialIssuance,
          CIAccessToken,
          IssueConfiguration,
          DIDLogs,
          ScopeDao
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
        IssueConfigurationService,
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
            handleCredentialRequest: vi.fn()
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
              "@context": ["https://www.w3.org/ns/credentials/v2"],
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
    it("Issuer metadata", async () => {
      const metadata = await issuerService.issuerMetadata();
      expect(metadata.credential_issuer).toBe("https://localhost");
      expect(
        metadata.credential_configurations_supported["ExampleCredentialType"]
      ).toBeDefined();
      expect(
        metadata.credential_configurations_supported["ExampleCredentialType"]
          .credential_metadata
      ).toBeDefined();
      expect(
        metadata.credential_configurations_supported["ExampleCredentialType"]
          .credential_metadata?.claims
      ).toHaveLength(1);
    });
    it("Create offer", async () => {
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:example.com",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:example.com" }
      });

      await expect(
        issuerService.createAccessToken(undefined as unknown as string)
      ).rejects.toThrow("No pre-authorized code provided");
      await expect(
        issuerService.createAccessToken("unknown-code")
      ).rejects.toThrow("No credential issuance flow found");

      const access_token = await issuerService.createAccessToken(
        offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
          "pre-authorized_code"
        ] ?? ""
      );

      await expect(
        issuerService.handleCredentialRequest(`Incorrect Header`, {})
      ).rejects.toThrow("Invalid authorization");
      await expect(
        issuerService.handleCredentialRequest(`Bearer UnknownAccessToken`, {})
      ).rejects.toThrow("Token not recognized");
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer ${access_token.access_token}`,
          {
            credential_identifier:
              access_token.authorization_details[0].credential_identifiers[0]
          }
        )
      ).rejects.toThrow("No JWT proof provided in credential request");

      const nonce = await issuerService.createNonce();
      const jwt = await new SignJWT({ nonce: nonce.c_nonce })
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
        await issuerService.handleCredentialRequest(
          `Bearer ${access_token.access_token}`,
          {
            credential_identifier:
              access_token.authorization_details[0].credential_identifiers[0],
            proofs: [
              {
                proof_type: ProofType.JWT,
                jwt: jwt
              }
            ]
          }
        )
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

      const nonce = await issuerService.createNonce();
      const jwt = await new SignJWT({ nonce: nonce.c_nonce })
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
        await issuerService.handleCredentialRequest(
          `Bearer ${access_token.access_token}`,
          {
            credential_identifier:
              access_token.authorization_details[0].credential_identifiers[0],
            proofs: [
              {
                proof_type: ProofType.JWT,
                jwt: jwt
              }
            ]
          }
        )
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

      const nonce = await issuerService.createNonce();
      const jwt = await new SignJWT({ nonce: nonce.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer ${access_token.access_token}`,
          {
            credential_identifier:
              access_token.authorization_details[0].credential_identifiers[0],
            proofs: [
              {
                proof_type: ProofType.JWT,
                jwt: jwt
              }
            ]
          }
        )
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

      const nonce = await issuerService.createNonce();
      const jwt = await new SignJWT({ nonce: nonce.c_nonce })
        .setProtectedHeader({
          alg: "EdDSA",
          typ: "openid4vci-proof+jwt",
          kid: "test1234234"
        })
        .setIssuer("did:web:example.com")
        .setAudience("http://localhost:3000")
        .setIssuedAt()
        .sign(exampleKey.privateKey);
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer ${access_token.access_token}`,
          {
            credential_identifier:
              access_token.authorization_details[0].credential_identifiers[0],
            proofs: [
              {
                proof_type: ProofType.JWT,
                jwt: jwt
              }
            ]
          }
        )
      ).rejects.toThrow(
        'Holder ID test1234234 did method not supported, supported methods: "did:web:", "did:key:", "did:tdw:"'
      );
    });

    it("Issuer Metadata", async () => {
      const metadata = await issuerService.issuerMetadata();
      expect(metadata.credential_issuer).toBe("https://localhost");
      expect(metadata.credential_endpoint).toBe(
        "http://localhost:3000/oid4vci/credential"
      );
      expect(metadata.token_endpoint).toEqual(
        "http://localhost:3000/oid4vci/token"
      );
      expect(metadata.credential_configurations_supported).toHaveProperty(
        "ExampleCredentialType"
      );
    });
  });
});
