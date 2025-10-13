import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";
import { cachedStatusCredentials } from "@tsg-dsp/common-signing-and-validation";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { RootConfig } from "../config.js";
import { CredentialsService } from "../credentials/credentials.service.js";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { SignatureService } from "../keys/signature.service.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { ScopeDao } from "../model/scopes.dao.js";
import { PresentationService } from "./presentation.service.js";

describe("Presentation Service", () => {
  let presentationService: PresentationService;
  let credentialService: CredentialsService;
  let server: SetupServer;
  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true
        },
        {
          id: "key-1",
          type: "EdDSA",
          default: false
        }
      ],
      initCredentials: [
        {
          context: [],
          type: [],
          id: `did:web:localhost#test-init-credential`,
          keyId: "key-1",
          credentialSubject: {
            id: "did:web:localhost"
          }
        }
      ]
    });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs,
          ScopeDao
        ]),
        TypeOrmModule.forFeature([
          CredentialDao,
          StatusListCredentialDao,
          DIDDocuments,
          DIDService,
          KeyMaterialDao,
          DIDLogs,
          ScopeDao
        ])
      ],
      providers: [
        CredentialsService,
        DidService,
        KeysService,
        SignatureService,
        PresentationService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    presentationService = moduleRef.get(PresentationService);
    credentialService = moduleRef.get(CredentialsService);
    const didService = moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
    await presentationService.initialized;
    server = setupServer(
      http.get("http://localhost/.well-known/did.json", async () => {
        return HttpResponse.json(await didService.getDid());
      }),
      http.get("http://localhost:3000/credentials/status-0", async () => {
        const credentialDao = await credentialService.getCredential(
          "http://localhost:3000/credentials/status-0"
        );
        return HttpResponse.json(credentialDao.credential);
      })
    );
    server.listen({ onUnhandledRequest: "warn" });
  });
  afterAll(() => {
    TypeOrmTestHelper.instance.teardownTestDB();
    server.close();
  });

  describe("Presentation interactions", () => {
    let vpJwt: VerifiablePresentationJwt;
    it("Get JSON-LD VP", async () => {
      await presentationService.createVerifiablePresentationJsonLd(
        "did:web:localhost#test-init-credential",
        false
      );
      await presentationService.createVerifiablePresentationJsonLd(
        "did:web:localhost#test-init-credential",
        true
      );
    });
    it("Get JWT VP", async () => {
      vpJwt = await presentationService.createVerifiablePresentationJwt(
        "did:web:localhost#test-init-credential",
        "did:web:external.com",
        false
      );
      await presentationService.createVerifiablePresentationJwt(
        "did:web:localhost#test-init-credential",
        "did:web:external.com",
        true
      );
    });
    it("Validate JWT VP", async () => {
      const validationResult = await presentationService.validatePresentation(
        vpJwt,
        "did:web:external.com"
      );
      expect(validationResult.validExpiryDate).toEqual([true]);
      expect(validationResult.validProof).toEqual([true]);
      expect(validationResult.validTrustAnchors).toEqual([true]);
      expect(validationResult.validateJWTSignature).toBe(true);
      expect(validationResult.validateJWTExpiryDate).toBe(true);
      expect(validationResult.validateAudience).toBe(true);
      expect(validationResult.valid).toBe(true);
    });
    it("Revocation checks", async () => {
      cachedStatusCredentials.clear();
      await credentialService.revokeCredential(
        "did:web:localhost#test-init-credential"
      );
      const validationResult = await presentationService.validatePresentation(
        vpJwt,
        "did:web:external.com"
      );
      expect(validationResult.validStatus).toEqual([false]);
      expect(validationResult.valid).toBe(false);
    });
  });
  describe("Scopes", () => {
    it("Default Scope interpolation", async () => {
      const scope = "org.eclipse.dspace.dcp.vc.type:VerifiableCredential";
      const presentationDefinition =
        await presentationService.interpretScope(scope);

      expect(
        presentationDefinition.input_descriptors[0].constraints.fields?.[0]
          .filter?.pattern
      ).toBe("VerifiableCredential");

      const scope2 = `org.eclipse.dspace.dcp.vc.id:${encodeURIComponent("did:web:localhost#test-init-credential")}`;
      const presentationDefinition2 =
        await presentationService.interpretScope(scope2);

      expect(
        presentationDefinition2.input_descriptors[0].constraints.fields?.[0]
          .filter?.pattern
      ).toBe("did:web:localhost#test-init-credential");

      const scope3 = `nl.tsg.adp.project:${encodeURIComponent("did:web:localhost")}:HASH`;
      const presentationDefinition3 =
        await presentationService.interpretScope(scope3);

      expect(
        presentationDefinition3.input_descriptors[0].constraints.fields?.[1]
          .filter?.pattern
      ).toBe("did:web:localhost");
      expect(
        presentationDefinition3.input_descriptors[0].constraints.fields?.[2]
          .filter?.pattern
      ).toBe("HASH");
    });
    it("Scope errors", async () => {
      await expect(
        presentationService.interpretScope("org.eclipse.dspace.dcp.vc.type")
      ).rejects.toThrow("Scope discriminator mismatch");
      await expect(
        presentationService.interpretScope("org.example.missing")
      ).rejects.toThrow("not found");
    });
  });
});
