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
  CredentialOfferMessage,
  CredentialRequestMessage
} from "@tsg-dsp/common-dtos";
import { createTestVerifiableCredential } from "@tsg-dsp/common-signing-and-validation/dist/utils/mock-vc-vp.util.mock.js";
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
import { CredentialsService } from "../../credentials/credentials.service.js";
import { DidService } from "../../did/did.service.js";
import { IssueConfigurationService } from "../../issue-configurations/issue-configuration.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import { SecureTokenService } from "../../keys/token.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { SIToken } from "../../model/dcp.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { CIAccessToken, CredentialIssuance } from "../../model/issuance.dao.js";
import { IssueConfiguration } from "../../model/issue-configuration.dao.js";
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
  let incorrectCredentialResponse: boolean = false;

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
          credentialType: "ExampleCredentialType",
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
          IssueConfiguration,
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
        IssueConfigurationService,
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
    issuanceService = moduleRef.get(IssuanceService);
    issuerService = moduleRef.get(DCPIssuerService);
    holderService = moduleRef.get(DCPHolderService);
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
              // "@context": ["https://www.w3.org/ns/credentials/v2"],
              "@id": "example:ExampleCredentialType"
            },
            example: "https://example.dataspac.es/credentials/",
            id: "@id",
            type: "@type"
          }
        });
      }),
      http.get("http://localhost:3000/dcp/issuer/metadata", async () => {
        return HttpResponse.json(await issuerService.issuerMetadata());
      }),
      http.post(
        "http://localhost:3000/dcp/issuer/credentials",
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
            headers: incorrectCredentialResponse
              ? {}
              : {
                  location: credentialRequest.url
                },
            status: HttpStatus.CREATED
          });
        }
      ),
      http.post(
        "http://localhost:3000/dcp/credentials",
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
      await new Promise((resolve) => setTimeout(resolve, 500));

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
      const newOffer = await issuanceService.createCredentialOffer({
        holderId: "did:web:localhost",
        credentialType: "ExampleCredentialType",
        credentialSubject: { id: "did:web:localhost" }
      });
      incorrectCredentialResponse = true;
      await expect(
        holderService.requestCredential({
          issuerId: "did:web:localhost",
          credentialType: ["ExampleCredentialType"],
          preAuthorizedCode:
            newOffer.grants?.[OfferGrants.PRE_AUTHORIZED_CODE]?.[
              "pre-authorized_code"
            ] ?? ""
        })
      ).rejects.toThrow("No credential request status location in response");
      incorrectCredentialResponse = false;
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      const stsIssuerMock = jest
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
      const stsHolderMock = jest
        .spyOn(holderService["secureTokenService"], "validateIDToken")
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

      stsIssuerMock.mockRestore();
      stsHolderMock.mockRestore();
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
      const stsHolderMock = jest
        .spyOn(holderService["secureTokenService"], "validateIDToken")
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
                format: "unknown-format",
                payload: "UNKNOWN_FORMAT_STRING",
                credentialType: "ExampleCredentialType"
              }
            ]
          })
        )
      ).rejects.toThrow("Unsupported credential format");
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
                format: "jwt",
                payload: `${(await createTestVerifiableCredential({ id: "did:web:test" }, "jwt_vc")).jwt}`,
                credentialType: "ExampleCredentialType"
              }
            ]
          })
        )
      ).rejects.toThrow(
        "Credential issuer did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz does not match token subject did:web:localhost"
      );
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
                format: "ldp",
                payload: `${JSON.stringify(await createTestVerifiableCredential({ id: "did:web:test" }, "DataIntegrityProof"))}`,
                credentialType: "ExampleCredentialType"
              }
            ]
          })
        )
      ).rejects.toThrow(
        "Credential issuer did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz does not match token subject did:web:localhost"
      );
      await expect(
        holderService.handleCredentialOfferMessage(
          `Bearer test`,
          plainToInstance(CredentialOfferMessage, {
            "@context": ["https://w3id.org/dspace-dcp/v1.0/dcp.jsonld"],
            type: "CredentialOfferMessage"
          })
        )
      ).rejects.toThrow("Method not implemented");
      stsHolderMock.mockRestore();
    });
    it("Holder profile formatting", async () => {
      expect(holderService["formatDcpProfile"]("vc20-bssl/jwt")).toEqual({
        score: 12,
        vcDataModel: "vc20",
        revocationSystem: "bssl",
        proofStack: "jwt"
      });
      expect(holderService["formatDcpProfile"]("vc20-bssl/ldp")).toEqual({
        score: 10,
        vcDataModel: "vc20",
        revocationSystem: "bssl",
        proofStack: "ldp"
      });
      expect(holderService["formatDcpProfile"]("vc11-bssl/jwt")).toEqual({
        score: 9,
        vcDataModel: "vc11",
        revocationSystem: "bssl",
        proofStack: "jwt"
      });
      expect(holderService["formatDcpProfile"]("vc11-sl2021/jwt")).toEqual({
        score: 5,
        vcDataModel: "vc11",
        revocationSystem: "sl2021",
        proofStack: "jwt"
      });
      expect(() =>
        holderService["formatDcpProfile"]("unknown-profile")
      ).toThrow("Invalid DCP profile format: unknown-profile");
    });
  });
});
