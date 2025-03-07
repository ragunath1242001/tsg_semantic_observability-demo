import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import {
  CredentialSubject,
  JsonWebSignature2020,
  toArray,
  VerifiableCredential,
  VerifiablePresentation
} from "@tsg-dsp/common-dsp";
import {
  ComplianceRequest,
  LegalRegistrationNumberRequest
} from "@tsg-dsp/wallet-dtos";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../../config.js";
import { DidService } from "../../did/did.service.js";
import { KeysService } from "../../keys/keys.service.js";
import { SignatureService } from "../../keys/signature.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../../model/did.dao.js";
import { CredentialsService } from "../credentials.service.js";
import { GaiaXService } from "./gaiax.service.js";

describe("Credentials Service", () => {
  let gaiaXService: GaiaXService;
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
      ]
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
        GaiaXService,
        DidService,
        SignatureService,
        KeysService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();

    gaiaXService = moduleRef.get(GaiaXService);
    credentialsService = moduleRef.get(CredentialsService);
    await credentialsService.initialized;
    didId = await moduleRef.get(DidService).getDidId();
  });

  afterAll(() => {
    server.close();
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Credentials CRUD", () => {
    it("Request Gaia LRN", async () => {
      const credential =
        await gaiaXService.requestLegalRegistrationNumberCredential(
          plainToInstance(LegalRegistrationNumberRequest, {
            vcId: `${didId}#LRN`,
            clearingHouse: "registrationnumber.notary.gaia-x.eu/v1",
            credentialSubject: {
              "@context": [
                "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/participant"
              ],
              type: "gx:legalRegistrationNumber",
              id: didId,
              "gx:vatID": "NL000099998B57"
            }
          }),
          undefined
        );
      expect(credential).toBeDefined();
      expect(credential.id).toBe(`${didId}#LRN`);
      expect(credential.credential.issuer).toBe(
        "did:web:registration.lab.gaia-x.eu:development"
      );

      await expect(
        gaiaXService.requestLegalRegistrationNumberCredential(
          {
            vcId: "LRN"
          } as LegalRegistrationNumberRequest,
          "did:web:localhost"
        )
      ).rejects.toThrow("Can't request credential with these identifiers");
      await expect(
        gaiaXService.requestLegalRegistrationNumberCredential(
          {
            vcId: "did:web:localhost#LRN",
            credentialSubject: {
              id: "did:web:external.com"
            }
          } as LegalRegistrationNumberRequest,
          "did:web:localhost"
        )
      ).rejects.toThrow("Can't request credential with these identifiers");
      await expect(
        gaiaXService.requestLegalRegistrationNumberCredential(
          {
            vcId: `${didId}#LRN`,
            clearingHouse: "localhost:1",
            credentialSubject: {
              "@context": [
                "https://registry.lab.gaia-x.eu/development/api/trusted-shape-registry/v1/shapes/jsonld/participant"
              ],
              type: "gx:legalRegistrationNumber",
              id: didId,
              "gx:vatID": "NL000099998B57"
            }
          },
          undefined
        )
      ).rejects.toThrow(
        "Error in requesting legal registration number credential"
      );
    });
    it("Request Gaia Compliance", async () => {
      const credential = await gaiaXService.requestComplianceCredential(
        plainToInstance(ComplianceRequest, {
          vcId: `${didId}#LRN`,
          clearingHouse: "compliance.gaia-x.eu/development",
          credentials: (await credentialsService.getCredentials())
            .map((c) => c.credential)
            .filter((c) => !c.type.includes("BitstringStatusListCredential"))
        }),
        undefined
      );
      expect(credential).toBeDefined();
      expect(credential.id).toBe(`${didId}#LRN`);
      expect(credential.credential.issuer).toBe(
        "did:web:compliance.lab.gaia-x.eu:development"
      );

      await expect(
        gaiaXService.requestComplianceCredential(
          {
            vcId: "Compliance"
          } as ComplianceRequest,
          "did:web:localhost"
        )
      ).rejects.toThrow("Can't request credential with these identifiers");
      await expect(
        gaiaXService.requestComplianceCredential(
          {
            vcId: `${didId}#LRN`,
            clearingHouse: "localhost:1",
            credentials: []
          } as ComplianceRequest,
          "did:web:localhost"
        )
      ).rejects.toThrow("Error in requesting compliance credential");
    });
  });
});
