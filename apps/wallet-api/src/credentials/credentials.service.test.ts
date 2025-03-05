import { Test, TestingModule } from "@nestjs/testing";
import { CredentialsService } from "./credentials.service.js";
import { plainToInstance } from "class-transformer";
import { InitCredentialConfig, RootConfig } from "../config.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { describe, expect, beforeAll, afterAll, it } from "@jest/globals";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import {
  CredentialSubject,
  JsonWebSignature2020,
  toArray,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import { DIDDocuments, DIDService, DIDLogs } from "../model/did.dao.js";
import { SignatureService } from "../keys/signature.service.js";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

describe("Credentials Service", () => {
  let credentialsService: CredentialsService;
  let server: SetupServer;
  let didId: string;

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
      initCredentials: [
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-0",
          credentialSubject: {
            id: "did:web:localhost"
          }
        }
      ],
      oid4vci: {
        holder: [
          {
            credentialType: "",
            preAuthorizationCode: "",
            issuerUrl: "https://issuer1.example.com"
          },
          {
            credentialType: "",
            preAuthorizationCode: "",
            issuerUrl: "https://issuer2.example.com"
          }
        ]
      }
    });

    server = setupServer(
      http.post<PathParams, CredentialSubject, VerifiableCredential>(
        "https://registrationnumber.notary.gaia-x.eu/v1/registrationNumberVC",
        async ({ request }) => {
          return HttpResponse.json<VerifiableCredential<JsonWebSignature2020>>({
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://w3id.org/security/suites/jws-2020/v1"
            ],
            type: ["VerifiableCredential"],
            id: new URL(request.url).searchParams.get("vcid") || "",
            issuer: "did:web:registration.lab.gaia-x.eu:development",
            issuanceDate: new Date().toISOString(),
            credentialSubject: await request.json(),
            proof: {
              type: "JsonWebSignature2020",
              created: new Date().toISOString(),
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:registration.lab.gaia-x.eu:development#X509-JWK2020",
              jws: ""
            }
          });
        }
      ),
      http.post<PathParams, VerifiablePresentation, VerifiableCredential>(
        "https://compliance.gaia-x.eu/development/api/credential-offers",
        async ({ request }) => {
          const json = await request.json();
          const vcs = toArray(json.verifiableCredential);

          return HttpResponse.json<VerifiableCredential<JsonWebSignature2020>>({
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://w3id.org/security/suites/jws-2020/v1"
            ],
            type: ["VerifiableCredential"],
            id: new URL(request.url).searchParams.get("vcid") || "",
            issuer: "did:web:compliance.lab.gaia-x.eu:development",
            issuanceDate: new Date().toISOString(),
            credentialSubject: vcs.map((credential) => {
              return {
                type: "gx:compliance",
                id: credential.id!,
                "gx:integrity": "sha256-000",
                "gx:integrityNormalization": "RFC8785:JCS",
                "gx:version": "22.10",
                "gx:type":
                  toArray(credential.credentialSubject)[0]["type"] ||
                  credential.type[0] ||
                  "unknown"
              };
            }),
            proof: {
              type: "JsonWebSignature2020",
              created: new Date().toISOString(),
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:compliance.lab.gaia-x.eu:development#X509-JWK2020",
              jws: ""
            }
          });
        }
      )
    );

    server.listen({ onUnhandledRequest: "bypass" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs
        ])
      ],
      providers: [
        CredentialsService,
        DidService,
        SignatureService,
        KeysService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    credentialsService = moduleRef.get(CredentialsService);
    await credentialsService.initialized;
    await credentialsService.init();
    await moduleRef.get(KeysService).initialized;
    didId = await moduleRef.get(DidService).getDidId();
  });

  afterAll(() => {
    server.close();
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Credentials CRUD", () => {
    it("Get credentials initial credentials", async () => {
      expect(await credentialsService.getCredentials()).toHaveLength(2);
    });
    it("Issue Credential", async () => {
      const credential = await credentialsService.issueCredential({
        context: [],
        type: [],
        id: `test-credential`,
        keyId: "key-0",
        revocable: false,
        credentialSubject: {
          id: didId
        }
      });
      expect(credential).toBeDefined();
      const credential2 = await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          id: "did:web:external-did.com#test-credential",
          revocable: false,
          credentialSubject: {
            id: didId
          }
        },
        "did:web:external-did.com"
      );
      expect(credential2).toBeDefined();
      await expect(
        credentialsService.issueCredential({
          context: [],
          type: [],
          id: `${didId}#test-credential`,
          revocable: false,
          credentialSubject: {
            id: didId
          }
        })
      ).rejects.toThrow("already exists");
      expect(await credentialsService.getCredentials()).toHaveLength(4);
    });
    it("Import credential", async () => {
      const testCredential = await credentialsService.getCredential(
        `${didId}#test-credential`
      );

      const importedCredential = await credentialsService.importCredential({
        ...testCredential.credential,
        id: `${didId}#imported-credential`,
        issuer: "did:web:external-issuer.com"
      });

      expect(importedCredential).toBeDefined();
      expect(importedCredential.selfIssued).toBe(false);
      expect(importedCredential.credential.issuer).toBe(
        "did:web:external-issuer.com"
      );

      await expect(
        credentialsService.importCredential({
          ...testCredential.credential,
          id: `imported-credential`,
          issuer: "did:web:external-issuer.com"
        })
      ).rejects.toThrow(
        "Imported credentials must be have an ID that starts with a DID appended with # and a credential ID"
      );
    });
    it("Update credential", async () => {
      const credential = await credentialsService.updateCredential(
        `${didId}#test-credential`,
        plainToInstance(InitCredentialConfig, {
          context: [],
          type: [],
          id: "test-credential",
          credentialSubject: {
            id: didId,
            "https://example.com/extraProperty": "test"
          }
        })
      );
      expect(credential).toBeDefined();
      expect(
        toArray(
          (await credentialsService.getCredential(`${didId}#test-credential`))
            .credential.credentialSubject
        )[0]["https://example.com/extraProperty"]
      ).toBe("test");

      const testCredential = await credentialsService.getCredential(
        `${didId}#test-credential`
      );
      const updateImportedCredential =
        await credentialsService.updateCredential(
          `${didId}#imported-credential`,
          {
            ...testCredential.credential,
            id: `${didId}#imported-credential`,
            issuer: "did:web:external-issuer.com"
          }
        );

      expect(updateImportedCredential).toBeDefined();
    });
    it("Delete credential", async () => {
      await credentialsService.deleteCredential(`${didId}#test-credential`);

      await expect(
        credentialsService.getCredential(`${didId}#test-credential`)
      ).rejects.toThrow("can't be found");
      await expect(
        credentialsService.deleteCredential(`${didId}#test-credential`)
      ).rejects.toThrow("can't be found");
    });
  });
  describe("getDataspaceCredentials", () => {
    it("should fetch dataspace credentials successfully", async () => {
      const mockDidDocument = {
        service: [
          {
            type: "Management",
            serviceEndpoint: "https://example.com/management"
          }
        ]
      };

      const mockCredentials = [
        { id: "cred1", type: ["VerifiableCredential"] },
        { id: "cred2", type: ["VerifiableCredential"] }
      ];

      server.use(
        http.get("https://issuer1.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocument);
        }),
        http.get("https://issuer2.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocument);
        }),
        http.get("https://example.com/management/credentials", () => {
          return HttpResponse.json(mockCredentials);
        })
      );

      const result = await credentialsService.getDataspaceCredentials(
        "did:web:issuer1.example.com,did:web:issuer2.example.com"
      );
      expect(result).toHaveLength(4); // 2 issuers * 2 credentials each
      expect(result).toEqual(
        expect.arrayContaining(mockCredentials.concat(mockCredentials))
      );
    });

    it("should return an empty array when no issuer URLs are configured", async () => {
      const result = await credentialsService.getDataspaceCredentials();
      expect(result).toEqual([]);
    });

    it("should throw an AppError when fetching credentials fails", async () => {
      server.use(
        http.get("https://issuer1.example.com/.well-known/did.json", () => {
          return HttpResponse.json({}, { status: 404 });
        })
      );

      const result = await credentialsService.getDataspaceCredentials(
        "did:web:issuer1.example.com"
      );
      expect(result).toEqual([]);
    });

    it("should handle DID documents without Management service", async () => {
      const mockDidDocumentWithoutManagement = {
        service: [
          {
            type: "OtherService",
            serviceEndpoint: "https://example.com/other"
          }
        ]
      };

      server.use(
        http.get("https://issuer1.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocumentWithoutManagement);
        }),
        http.get("https://issuer2.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocumentWithoutManagement);
        })
      );

      const result = await credentialsService.getDataspaceCredentials();
      expect(result).toEqual([]);
    });

    it("should handle mixed responses from different issuers", async () => {
      const mockDidDocumentWithManagement = {
        service: [
          {
            type: "Management",
            serviceEndpoint: "https://example.com/management"
          }
        ]
      };

      const mockDidDocumentWithoutManagement = {
        service: [
          {
            type: "OtherService",
            serviceEndpoint: "https://example.com/other"
          }
        ]
      };

      const mockCredentials = [{ id: "cred1", type: ["VerifiableCredential"] }];

      server.use(
        http.get("https://issuer1.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocumentWithManagement);
        }),
        http.get("https://issuer2.example.com/.well-known/did.json", () => {
          return HttpResponse.json(mockDidDocumentWithoutManagement);
        }),
        http.get("https://example.com/management/credentials", () => {
          return HttpResponse.json(mockCredentials);
        })
      );

      const result = await credentialsService.getDataspaceCredentials(
        "did:web:issuer1.example.com,did:web:issuer2.example.com"
      );
      expect(result).toHaveLength(1);
      expect(result).toEqual(expect.arrayContaining(mockCredentials));
    });
  });
  describe("Credential Revocation", () => {
    it("Generate test credentials", async () => {
      const credentials = [];
      for (let i = 0; i < 5; i++) {
        credentials.push(
          await credentialsService.issueCredential({
            context: [],
            type: [],
            id: `test-credential-${i}`,
            keyId: "key-0",
            revocable: true,
            credentialSubject: {
              id: didId
            }
          })
        );
      }
      const statusCredentialPreRevocation =
        await credentialsService.getCredential(
          credentials[0].statusListCredential!.id
        );
      await credentialsService.revokeCredential(credentials[2].id);
      const statusListCredential = await credentialsService[
        "statusListCredentialRepository"
      ].findOneBy({ id: credentials[0].statusListCredential!.id });
      expect(statusListCredential!.revoked).toContain(
        credentials[2].statusListIndex!
      );

      const statusCredentialPostRevocation =
        await credentialsService.getCredential(
          credentials[0].statusListCredential!.id
        );
      expect(
        toArray(statusCredentialPreRevocation.credential.credentialSubject)[0]
          .encodedList
      ).not.toBe(
        toArray(statusCredentialPostRevocation.credential.credentialSubject)[0]
          .encodedList
      );
    });
    it("Generate test credentials", async () => {
      const credentials = [];
      const start = new Date().getTime();
      for (let i = 0; i < 1100; i++) {
        const credential = await credentialsService.issueCredential({
          context: [],
          type: [],
          id: `test-credential-${i}`,
          keyId: "key-0",
          revocable: true,
          credentialSubject: {
            id: didId
          }
        });
        if (i % 100 === 0) {
          console.log(
            `Issued ${i} credentials after ${new Date().getTime() - start}ms`
          );
        }
        if (i == 0 || i == 1099) {
          credentials.push(credential);
        }
      }
      expect(credentials[0].statusListCredential?.id).not.toBe(
        credentials[1].statusListCredential?.id
      );
    });
  });
});
