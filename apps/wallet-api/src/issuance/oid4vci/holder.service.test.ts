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
      issueConfigurations: [
        {
          id: "Example",
          credentialType: "ExampleCredentialType",
          documentUrl: "https://example.com/context.json"
        },
        {
          id: "ExampleLdp",
          credentialType: "ExampleLdpCredentialType",
          documentUrl: "https://example.com/context.json",
          proofType: "ldp"
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
        PresentationService,
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
            handleCredentialRequest: jest.fn()
          }
        }
      ]
    }).compile();
    issuanceService = moduleRef.get(IssuanceService);
    issuerService = moduleRef.get(OID4VCIIssuerService);
    holderService = moduleRef.get(OID4VCIHolderService);

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
            ExampleLdpCredentialType: {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              "@id": "example:ExampleLdpCredentialType"
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
      http.post("http://localhost:3000/oid4vci/nonce", async () => {
        return HttpResponse.json(await issuerService.createNonce());
      }),
      http.post<PathParams, any, AccessToken>(
        "http://localhost:3000/oid4vci/token",
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
        "http://localhost:3000/oid4vci/credential",
        async (ctx) => {
          const body = await ctx.request.json();
          const authorization = ctx.request.headers.get("Authorization");
          return HttpResponse.json(
            await issuerService.handleCredentialRequest(authorization!, body)
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
    it("Request credential via JWT", async () => {
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
      expect(credentials.length).toBe(2);
    });
    it("Request credential via LDP", async () => {
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "ExampleLdpCredentialType",
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
      expect(credentials.length).toBe(3);
    });
    it("Request errros", async () => {
      await expect(
        holderService.requestCredential({
          issuerUrl: "http://localhost:3000"
        } as any)
      ).rejects.toThrow(
        "Either pre-authorized code or access token must be provided"
      );

      const incorrectOffer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "UnknownCredential",
        credentialSubject: { id: "did:web:localhost" }
      });

      await expect(
        holderService.requestCredential({
          issuerUrl: "http://localhost:3000",
          preAuthorizedCode:
            incorrectOffer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
              "pre-authorized_code"
            ]
        })
      ).rejects.toThrow(
        "Credential configuration for UnknownCredential not found"
      );

      await expect(
        holderService.requestCredential({
          issuerUrl: "http://localhost:3000",
          authorized: {
            accessToken: "test",
            credentialIdentifier: undefined as unknown as string
          }
        })
      ).rejects.toThrow(
        "Access token does not contain authorization details or credential identifier"
      );
    });
  });
});
