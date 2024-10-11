import { Test, TestingModule } from "@nestjs/testing";
import { CredentialsService } from "./credentials.service.js";
import { plainToInstance } from "class-transformer";
import { InitCredentialConfig, RootConfig } from "../config.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { Credentials, KeyMaterials } from "../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { describe, expect, beforeAll, afterAll, it, jest } from "@jest/globals";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, PathParams, http } from "msw";
import {
  CredentialSubject,
  VerifiableCredential,
  VerifiablePresentation,
} from "@tsg-dsp/common-dsp";
import { toArray } from "../utils/unions.js";
import { DIDDocuments, DIDService, DIDLogs } from "../model/did.dao.js";
import { DidResolverService } from "../did/did.resolver.service.js";
import { SignatureService } from "../keys/signature.service.js";

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
          default: true,
        },
      ],
      initCredentials: [
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-0",
          credentialSubject: {
            id: "did:web:localhost",
          },
        },
      ],
    });

    server = setupServer(
      http.post<
        PathParams,
        CredentialSubject,
        VerifiableCredential<CredentialSubject>
      >(
        "https://registrationnumber.notary.gaia-x.eu/v1/registrationNumberVC",
        async ({ request, params, cookies }) => {
          return HttpResponse.json<VerifiableCredential<CredentialSubject>>({
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://w3c.github.io/vc-jws-2020/contexts/v1/",
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
              jws: "",
            },
          });
        }
      ),
      http.post<
        PathParams,
        VerifiablePresentation<VerifiableCredential<CredentialSubject>>,
        VerifiableCredential<CredentialSubject>
      >(
        "https://compliance.gaia-x.eu/development/api/credential-offers",
        async ({ request, params, cookies }) => {
          const json = await request.json();
          const vcs = toArray(json.verifiableCredential);

          return HttpResponse.json<VerifiableCredential<CredentialSubject>>({
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://w3c.github.io/vc-jws-2020/contexts/v1/",
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
                  "unknown",
              };
            }),
            proof: {
              type: "JsonWebSignature2020",
              created: new Date().toISOString(),
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:compliance.lab.gaia-x.eu:development#X509-JWK2020",
              jws: "",
            },
          });
        }
      )
    );

    server.listen({ onUnhandledRequest: "bypass" });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          DIDLogs,
        ]),
        TypeOrmModule.forFeature([
          Credentials,
          DIDDocuments,
          DIDService,
          KeyMaterials,
          DIDLogs,
        ]),
      ],
      providers: [
        CredentialsService,
        DidService,
        DidResolverService,
        SignatureService,
        KeysService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();

    credentialsService = moduleRef.get(CredentialsService);
    await credentialsService.initialized;
    await credentialsService.init();
    didId = await moduleRef.get(DidService).getDidId();
  });

  afterAll(() => {
    server.close();
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("Credentials CRUD", () => {
    it("Get credentials initial credentials", async () => {
      expect(await credentialsService.getCredentials()).toHaveLength(1);
    });
    it("Issue Credential", async () => {
      const credential = await credentialsService.issueCredential({
        context: [],
        type: [],
        id: `test-credential`,
        keyId: "key-0",
        credentialSubject: {
          id: didId,
        },
      });
      expect(credential).toBeDefined();
      const credential2 = await credentialsService.issueCredential(
        {
          context: [],
          type: [],
          id: "did:web:external-did.com#test-credential",
          credentialSubject: {
            id: didId,
          },
        },
        "did:web:external-did.com"
      );
      expect(credential2).toBeDefined();
      await expect(
        credentialsService.issueCredential({
          context: [],
          type: [],
          id: `${didId}#test-credential`,
          credentialSubject: {
            id: didId,
          },
        })
      ).rejects.toThrow("already exists");
      expect(await credentialsService.getCredentials()).toHaveLength(3);
    });
    it("Import credential", async () => {
      const testCredential = await credentialsService.getCredential(
        `${didId}#test-credential`
      );

      const importedCredential = await credentialsService.importCredential({
        ...testCredential.credential,
        id: `${didId}#imported-credential`,
        issuer: "did:web:external-issuer.com",
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
          issuer: "did:web:external-issuer.com",
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
            "https://example.com/extraProperty": "test",
          },
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
            issuer: "did:web:external-issuer.com",
          }
        );
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
});
