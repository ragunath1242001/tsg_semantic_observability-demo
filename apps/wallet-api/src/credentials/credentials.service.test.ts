import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import {
  CredentialSubject,
  toArray,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  createTestVerifiableCredential,
  testDidId
} from "@tsg-dsp/common-signing-and-validation/dist/utils/mock-vc-vp.util.mock.js";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { InitCredentialConfig, RootConfig } from "../config.js";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { SignatureService } from "../keys/signature.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { CredentialsService } from "./credentials.service.js";

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
      issuance: {
        statusListCount: 10
      },
      oid4vci: {
        holder: [
          {
            credentialType: "",
            preAuthorizedCode: "",
            issuerUrl: "https://issuer1.example.com"
          },
          {
            credentialType: "",
            preAuthorizedCode: "",
            issuerUrl: "https://issuer2.example.com"
          }
        ]
      }
    });

    server = setupServer(
      http.post<PathParams, CredentialSubject, VerifiableCredential>(
        "https://registrationnumber.notary.gaia-x.eu/v1/registrationNumberVC",
        async ({ request }) => {
          return HttpResponse.json<VerifiableCredential>({
            "@context": [
              "https://www.w3.org/ns/credentials/v2",
              "https://w3id.org/security/suites/jws-2020/v1"
            ],
            type: ["VerifiableCredential"],
            id: new URL(request.url).searchParams.get("vcid") || "",
            issuer: "did:web:registration.lab.gaia-x.eu:development",
            validFrom: new Date().toISOString(),
            credentialSubject: await request.json(),
            proof: {
              type: "DataIntegrityProof",
              created: "2024-07-30T13:51:30.581Z",
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:dataspace-authority.example.com#key-0",
              cryptosuite: "eddsa-jcs-2022",
              proofValue:
                "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
            }
          });
        }
      ),
      http.post<PathParams, VerifiablePresentation, VerifiableCredential>(
        "https://compliance.gaia-x.eu/development/api/credential-offers",
        async ({ request }) => {
          const json = await request.json();
          const vcs = toArray(json.verifiableCredential);

          return HttpResponse.json<VerifiableCredential>({
            "@context": [
              "https://www.w3.org/ns/credentials/v2",
              "https://w3id.org/security/suites/jws-2020/v1"
            ],
            type: ["VerifiableCredential"],
            id: new URL(request.url).searchParams.get("vcid") || "",
            issuer: "did:web:compliance.lab.gaia-x.eu:development",
            validFrom: new Date().toISOString(),
            credentialSubject: vcs.map((credential) => {
              return {
                type: "gx:compliance",
                id: credential.id!,
                "gx:integrity": "sha256-000",
                "gx:integrityNormalization": "RFC8785:JCS",
                "gx:version": "22.10",
                "gx:type":
                  toArray(
                    (credential as VerifiableCredential).credentialSubject
                  )[0]["type"] ||
                  credential.type[0] ||
                  "unknown"
              };
            }),
            proof: {
              type: "DataIntegrityProof",
              created: "2024-07-30T13:51:30.581Z",
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:dataspace-authority.example.com#key-0",
              cryptosuite: "eddsa-jcs-2022",
              proofValue:
                "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
            }
          });
        }
      )
    );

    server.listen({ onUnhandledRequest: "warn" });

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
        proofType: "ldp",
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
          proofType: "ldp",
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
          proofType: "ldp",
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
        proof: testCredential.proof!,
        id: `${didId}#imported-credential`,
        issuer: "did:web:external-issuer.com"
      });

      expect(importedCredential).toBeDefined();
      expect(importedCredential.selfIssued).toBe(false);
      expect(importedCredential.credential.issuer).toBe(
        "did:web:external-issuer.com"
      );

      const importedJwtCredential = await credentialsService.importCredential(
        (
          await createTestVerifiableCredential(
            {
              id: didId
            },
            "vc+jwt",
            {
              credentialType: "ExampleCredentialType"
            }
          )
        ).jwt,
        testDidId
      );
      expect(importedJwtCredential).toBeDefined();
      expect(importedJwtCredential.selfIssued).toBe(false);
      expect(importedJwtCredential.jwt).toBeDefined();
      const importedEnvelopedCredential =
        await credentialsService.importCredential(
          await createTestVerifiableCredential(
            {
              id: didId
            },
            "enveloped",
            {
              credentialType: "ExampleCredentialType"
            }
          ),
          testDidId
        );
      expect(importedEnvelopedCredential).toBeDefined();
      expect(importedEnvelopedCredential.selfIssued).toBe(false);
      expect(importedEnvelopedCredential.jwt).toBeDefined();

      await expect(
        credentialsService.importCredential({
          ...testCredential.credential,
          proof: testCredential.proof!,
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
      const ldpCredential = testCredential.credential as VerifiableCredential;

      const updateImportedCredential =
        await credentialsService.updateCredential(
          `${didId}#imported-credential`,
          {
            ...ldpCredential,
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
          // eslint-disable-next-line no-await-in-loop
          await credentialsService.issueCredential({
            context: [],
            type: [],
            id: `test-credential-${i}`,
            proofType: "ldp",
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
    it("Test statuslist credential overflow", async () => {
      const credentials = [];
      for (let i = 0; i < 12; i++) {
        // eslint-disable-next-line no-await-in-loop
        const credential = await credentialsService.issueCredential({
          context: [],
          type: [],
          id: `test-credential-${i}`,
          keyId: "key-0",
          proofType: "ldp",
          revocable: true,
          credentialSubject: {
            id: didId
          }
        });
        if (i == 0 || i == 11) {
          credentials.push(credential);
        }
      }
      expect(credentials[0].statusListCredential?.id).not.toBe(
        credentials[1].statusListCredential?.id
      );
    });
  });

  describe("getPaginatedCredentials", () => {
    it("should return paginated credentials for a target DID", async () => {
      // Setup some test credentials
      const targetDid = "did:web:test-target.com";
      await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          revocable: false,
          id: "test-paginated-1",
          proofType: "ldp",
          keyId: "key-0",
          credentialSubject: { id: targetDid }
        },
        targetDid
      );

      await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          id: "test-paginated-2",
          proofType: "ldp",
          revocable: false,
          keyId: "key-0",
          credentialSubject: { id: targetDid }
        },
        targetDid
      );

      // Test pagination
      const result = await credentialsService.getPaginatedCredentials(
        {
          page: 1,
          typeOrm: { skip: 0, take: 10, order: { createdDate: Order.DESC } },
          order: Order.ASC,
          order_by: "",
          per_page: 0,
          skip: 0,
          take: 0
        },
        targetDid
      );

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data[0].targetDid).toBe(targetDid);
      expect(result.data[1].targetDid).toBe(targetDid);
    });

    it("should return all credentials when no target DID is provided", async () => {
      const result = await credentialsService.getPaginatedCredentials({
        page: 1,
        typeOrm: {
          skip: 0,
          take: 100,
          order: {}
        },
        order: Order.ASC,
        order_by: "",
        per_page: 0,
        skip: 0,
        take: 0
      });

      // This should return all credentials in the database
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe("getPaginatedCredentialsPublic", () => {
    it("should filter out credentials for mobile devices and sensitive data", async () => {
      // Create a credential with a did:key DID (mobile device)
      const mobileDid =
        "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp";
      await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          id: "mobile-credential",
          keyId: "key-0",
          proofType: "ldp",
          credentialSubject: {
            id: mobileDid
          },
          revocable: false
        },
        mobileDid
      );

      // Create a regular credential with sensitive data
      const regularDid = "did:web:regular.com";
      await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          id: "regular-credential",
          keyId: "key-0",
          proofType: "ldp",
          credentialSubject: {
            id: regularDid
          },
          revocable: false
        },
        regularDid
      );

      const result = await credentialsService.getPaginatedCredentialsPublic({
        page: 1,

        typeOrm: {
          skip: 0,
          take: 100,
          order: {}
        },
        order: Order.ASC,
        order_by: "",
        per_page: 0,
        skip: 0,
        take: 0
      });

      // Mobile credentials should be filtered out
      const hasMobileCredential = result.data.some(
        (cred) => cred.targetDid === mobileDid
      );
      expect(hasMobileCredential).toBe(false);
    });
  });
});
