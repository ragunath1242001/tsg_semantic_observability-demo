import { describe, expect, beforeAll, it } from "@jest/globals";
import { DidService } from "./did.service.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DIDDocuments,
  DIDService,
  KeyMaterials,
} from "../model/credentials.dao.js";
import { DIDDocument } from "did-resolver";
import { generateKeyPair, exportJWK } from "jose";

describe("DID Service", () => {
  let didService: DidService;

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
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          DIDDocuments,
          DIDService,
          DIDService,
        ]),
        TypeOrmModule.forFeature([DIDDocuments, DIDService]),
      ],
      providers: [
        DidService,
        {
          provide: RootConfig,
          useValue: config,
        },
      ],
    }).compile();

    didService = await moduleRef.get(DidService);
  });

  describe("DID Document testing", () => {
    let initialCreatedDid: DIDDocument;
    let createdDidWithKey: DIDDocument;

    it("Retrieve non existing DID", async () => {
      await expect(didService.getDid()).rejects.toThrow(
        "DID Document not ready yet"
      );
    });

    it("Create initial DID document", async () => {
      initialCreatedDid = await didService.createDidDocument([]);
      expect(initialCreatedDid).toBeDefined();
    });

    it("Get DID ID", async () => {
      const didId = await didService.getDidId();
      expect(didId).toBe("did:web:localhost");
    });

    it("Retrieve created DID document", async () => {
      const retrievedDid = await didService.getDid();
      expect(retrievedDid.id).toEqual(initialCreatedDid.id);
      expect(retrievedDid["@context"]).toEqual(initialCreatedDid["@context"]);
    });

    it("Create DID document with key material", async () => {
      const keypair = await generateKeyPair("EdDSA");
      const keyMaterial: KeyMaterials = plainToInstance(KeyMaterials, {
        id: "test-key",
        type: "EdDSA",
        default: true,
        privateKey: await exportJWK(keypair.privateKey),
        publicKey: await exportJWK(keypair.publicKey),
        caChain: undefined,
      });
      createdDidWithKey = await didService.createDidDocument([keyMaterial]);
      expect(createdDidWithKey).toBeDefined();
      expect(createdDidWithKey.verificationMethod).toHaveLength(1);
      expect(createdDidWithKey.assertionMethod).toHaveLength(1);
    });

    it("Retrieve created DID document with key", async () => {
      const retrievedDid = await didService.getDid();
      expect(retrievedDid.id).toEqual(createdDidWithKey.id);
      expect(retrievedDid["@context"]).toEqual(createdDidWithKey["@context"]);
      expect(retrievedDid.assertionMethod).toEqual(
        createdDidWithKey.assertionMethod
      );
      expect(retrievedDid.verificationMethod).toEqual(
        createdDidWithKey.verificationMethod
      );
    });
  });

  describe("DID Service management", () => {
    it("Insert service", async () => {
      const service = await didService.insertService({
        id: "did:web:localhost#TestService",
        type: "TestService",
        serviceEndpoint: "http://localhost",
      });
      expect(service.id).toBe("did:web:localhost#TestService");
      expect(service.type).toBe("TestService");
      expect(service.serviceEndpoint).toBe("http://localhost");
    });
    it("Insert already existing service", async () => {
      await expect(
        didService.insertService({
          id: "did:web:localhost#TestService",
          type: "TestService",
          serviceEndpoint: "http://localhost",
        })
      ).rejects.toThrow("already exists");
    });
    it("Get service", async () => {
      const service = await didService.getService(
        "did:web:localhost#TestService"
      );
      expect(service.id).toBe("did:web:localhost#TestService");
      expect(service.type).toBe("TestService");
      expect(service.serviceEndpoint).toBe("http://localhost");
    });
    it("Update service", async () => {
      const service = await didService.updateService(
        "did:web:localhost#TestService",
        {
          id: "did:web:localhost#TestService",
          type: "TestService",
          serviceEndpoint: "http://localhost/service",
        }
      );
      expect(service.id).toBe("did:web:localhost#TestService");
      expect(service.type).toBe("TestService");
      expect(service.serviceEndpoint).toBe("http://localhost/service");
    });
    it("Delete service", async () => {
      await didService.deleteService("did:web:localhost#TestService");
    });
    it("Get non-existing service", async () => {
      await expect(
        didService.getService("did:web:localhost#TestService")
      ).rejects.toThrow("not found");
    });
    it("Update non-existing service", async () => {
      await expect(
        didService.updateService("did:web:localhost#TestService", {
          id: "did:web:localhost#TestService",
          type: "TestService",
          serviceEndpoint: "http://localhost",
        })
      ).rejects.toThrow("does not exist");
    });
  });
});
