import { describe, expect, beforeAll, it } from "@jest/globals";
import { DidService } from "./did.service.js";
import { TypeOrmTestHelper } from "../utils/testhelper.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DIDDocuments, KeyMaterials } from "../model/credentials.dao.js";
import { DIDDocument } from "did-resolver";
import { generateKeyPair, exportJWK } from "jose";

describe("DID Service", () => {
  let didService: DidService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      mail: {
        smtp: {
          host: "localhost",
          port: 465,
          secure: true,
          user: "test",
          password: "test",
          from: "test@test.com",
        },
        title: "Test",
        dataspace: "Test",
      },
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
        TypeOrmTestHelper.instance.module([DIDDocuments]),
        TypeOrmModule.forFeature([DIDDocuments]),
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
      const nonExistingDid = await didService.getDid();
      expect(nonExistingDid).toBeUndefined();
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
      expect(retrievedDid).toEqual(initialCreatedDid);
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
      expect(retrievedDid).toEqual(createdDidWithKey);
    });
  });
});
