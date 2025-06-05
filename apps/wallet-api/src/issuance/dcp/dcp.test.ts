import { jest } from "@jest/globals";
import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EmailService,
  NodemailerConfiguration,
  PaginationOptionsDto,
  TypeOrmTestHelper
} from "@tsg-dsp/common-api";
import {
  CredentialMessage,
  CredentialRequestMessage
} from "@tsg-dsp/common-dtos";
import { OfferGrants } from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import { DIDDocument } from "did-resolver";
import {
  decodeJwt,
  exportJWK,
  generateKeyPair,
  GenerateKeyPairResult
} from "jose";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../../config.js";
import { ContextService } from "../../contexts/context.service.js";
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import { JSONLDContext } from "../../model/context.dao.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { SIToken } from "../../model/dcp.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../../model/issuance.dao.js";
import { PresentationService } from "../../presentation/presentation.service.js";
import { IssuanceService } from "../issuance.service.js";
import { OID4VCIHolderService } from "../oid4vci/holder.service.js";
import { DCPHolderService } from "./holder.service.js";
import { DCPIssuerService } from "./issuer.service.js";

describe("DCP Issuance", () => {
  let issuanceService: IssuanceService;
  let issuerService: DCPIssuerService;
  let holderService: DCPHolderService;
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
          DIDLogs,
          SIToken
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
          DIDLogs,
          SIToken
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
        DCPIssuerService,
        DCPHolderService,
        ContextService,
        SecureTokenService,
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
          provide: OID4VCIHolderService,
          useValue: {
            requestCredential: jest.fn()
          }
        }
      ]
    }).compile();
    issuanceService = await moduleRef.get(IssuanceService);
    issuerService = await moduleRef.get(DCPIssuerService);
    holderService = await moduleRef.get(DCPHolderService);
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
              // "@context": ["https://www.w3.org/2018/credentials/v1"],
              "@id": "example:ExampleCredentialType"
            },
            example: "https://example.dataspac.es/credentials/",
            id: "@id",
            type: "@type"
          }
        });
      }),
      http.get("http://localhost:3000/api/dcp/issuer/metadata", async () => {
        return HttpResponse.json(await issuerService.issuerMetadata());
      }),
      http.post(
        "http://localhost:3000/api/dcp/issuer/credentials",
        async ({ request }) => {
          const auth = request.headers.get("authorization")!;
          const body = plainToInstance(
            CredentialRequestMessage,
            await request.json()
          );
          const credentialRequest = await issuerService.handleCredentialRequest(
            auth,
            body
          );
          return new HttpResponse("", {
            headers: {
              location: credentialRequest.url
            },
            status: HttpStatus.CREATED
          });
        }
      ),
      http.post(
        "http://localhost:3000/api/dcp/credentials",
        async ({ request }) => {
          const auth = request.headers.get("authorization")!;
          const body = plainToInstance(CredentialMessage, await request.json());
          setImmediate(() => holderService.handleCredentialMessage(auth, body));
          return HttpResponse.text("OK");
        }
      )
    );
    server.listen({ onUnhandledRequest: "bypass" });
  });

  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Issuance Process", () => {
    it("Issuance flow", async () => {
      const stsMock = jest
        .spyOn(issuerService["secureTokenService"], "validateIDToken")
        .mockImplementation(async (token: string) => {
          if (token === "test") {
            return {
              iss: "did:web:localhost",
              sub: "did:web:localhost",
              aud: "did:web:localhost"
            };
          } else {
            return decodeJwt(token);
          }
        });
      const offer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:localhost" }
      });
      const offers = await issuanceService.credentialOfferStatus(
        PaginationOptionsDto.NO_PAGINATION
      );

      await expect(
        issuerService.handleCredentialStatusRequest(`Bearer test`, "2")
      ).rejects.toThrow("No credential issuance flow found");

      await holderService.requestCredential({
        issuerId: "did:web:localhost",
        credentialType: ["ExampleCredentialType"],
        preAuthorizedCode:
          offer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
            "pre-authorized_code"
          ] ?? ""
      });
      let status = await issuerService.handleCredentialStatusRequest(
        `Bearer test`,
        offers.data[0].id
      );
      expect(status.status).toBe("RECEIVED");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const credentials =
        await holderService["credentialsService"].getCredentials();

      expect(credentials.length).toBe(2);
      expect(
        credentials.find((c) =>
          c.credential.type.includes("ExampleCredentialType")
        )
      ).toBeDefined();

      status = await issuerService.handleCredentialStatusRequest(
        `Bearer test`,
        offers.data[0].id
      );
      expect(status.status).toBe("ISSUED");
      stsMock.mockRestore();
    });
    it("Issuer errors", async () => {
      await expect(
        holderService.requestCredential({
          issuerId: "did:web:localhost",
          credentialType: ["UnknownCredentialType"],
          preAuthorizedCode: "pre-auth-code"
        })
      ).rejects.toThrow("Issuer does not support credential type");
      const tokenAttributes: Record<string, string> = {};
      const stsMock = jest
        .spyOn(issuerService["secureTokenService"], "validateIDToken")
        .mockImplementation(async (token: string) => {
          if (token === "test") {
            return {
              iss: "did:web:localhost",
              sub: "did:web:localhost",
              aud: "did:web:localhost",
              ...tokenAttributes
            };
          } else {
            return decodeJwt(token);
          }
        });
      await expect(
        issuerService.handleCredentialRequest(
          ``,
          {} as CredentialRequestMessage
        )
      ).rejects.toThrow("Invalid authorization");
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer test`,
          {} as CredentialRequestMessage
        )
      ).rejects.toThrow("No access token in self-issued ID token");
      tokenAttributes["token"] = "test-access-token";
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer test`,
          {} as CredentialRequestMessage
        )
      ).rejects.toThrow("Only pre-authorized code flows supported");
      tokenAttributes["pre-authorized_code"] = "pre-auth-code";
      await expect(
        issuerService.handleCredentialRequest(
          `Bearer test`,
          {} as CredentialRequestMessage
        )
      ).rejects.toThrow("No credential issuance flow found");

      await expect(
        issuerService.handleCredentialStatusRequest(``, "1")
      ).rejects.toThrow("Invalid authorization");
      await expect(
        issuerService.handleCredentialStatusRequest(`Bearer test`, "2")
      ).rejects.toThrow("No credential issuance flow found");

      stsMock.mockRestore();
    });
    it("Holder errors", async () => {
      jest
        .spyOn(
          issuerService["secureTokenService"],
          "validateIDTokenWithAccessToken"
        )
        .mockImplementation(async (token: string) => {
          if (token === "test") {
            return {
              originalIdToken: {
                audience: "did:web:localhost",
                accessToken: "test",
                id: 0,
                createdDate: new Date(),
                modifiedDate: new Date(),
                deletedDate: new Date()
              },
              tokenPayload: {
                iss: "did:web:localhost",
                sub: "did:web:localhost",
                aud: "did:web:localhost",
                token: "test"
              }
            };
          } else {
            return decodeJwt(token);
          }
        });

      await expect(
        holderService.handleCredentialMessage(``, {} as CredentialMessage)
      ).rejects.toThrow("Invalid authorization");
      await expect(
        holderService.handleCredentialMessage(
          `Bearer test`,
          plainToInstance(CredentialMessage, {
            "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
            type: "CredentialMessage",
            issuerPid: "0",
            holderPid: "1",
            status: "REJECTED",
            rejectionReason: "test",
            credentials: []
          })
        )
      ).resolves.toBeUndefined();

      await expect(
        holderService.handleCredentialMessage(
          `Bearer test`,
          plainToInstance(CredentialMessage, {
            "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
            type: "CredentialMessage",
            issuerPid: "0",
            holderPid: "1",
            status: "ISSUED",
            credentials: undefined
          })
        )
      ).rejects.toThrow("No credentials in credential message");

      await expect(
        holderService.handleCredentialMessage(
          `Bearer test`,
          plainToInstance(CredentialMessage, {
            "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
            type: "CredentialMessage",
            issuerPid: "0",
            holderPid: "1",
            status: "ISSUED",
            credentials: [
              {
                type: "CredentialContainer",
                format: "jwt",
                payload: "JWT_STRING",
                credentialType: "ExampleCredentialType"
              }
            ]
          })
        )
      ).rejects.toThrow("not supported");
    });
  });
});
