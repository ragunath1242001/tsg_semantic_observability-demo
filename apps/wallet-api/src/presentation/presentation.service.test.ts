import { Test, TestingModule } from "@nestjs/testing";
import { CredentialsService } from "../credentials/credentials.service.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import {
  CredentialDao,
  KeyMaterialDao,
  StatusListCredentialDao
} from "../model/credentials.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DidService } from "../did/did.service.js";
import { KeysService } from "../keys/keys.service.js";
import { PresentationService } from "./presentation.service.js";
import { describe, expect, beforeAll, afterAll, it, jest } from "@jest/globals";
import { DidResolverService } from "../did/did.resolver.service.js";
import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { DIDDocuments, DIDService, DIDLogs } from "../model/did.dao.js";
import { SignatureService } from "../keys/signature.service.js";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

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
        DidResolverService,
        KeysService,
        SignatureService,
        PresentationService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
    }).compile();
    presentationService = await moduleRef.get(PresentationService);
    credentialService = await moduleRef.get(CredentialsService);
    const didService = await moduleRef.get(DidService);
    await moduleRef.get(KeysService).initialized;
    await moduleRef.get(CredentialsService).initialized;
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
      presentationService["cachedStatusCredentials"].clear();
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
});
