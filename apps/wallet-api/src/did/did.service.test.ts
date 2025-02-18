import { describe, expect, beforeAll, it } from "@jest/globals";
import { DidService } from "./did.service.js";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";
import { TestingModule, Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { DIDDocument } from "did-resolver";
import { generateKeyPair, exportJWK } from "jose";
import { DIDDocuments, DIDLogs, DIDService } from "../model/did.dao.js";
import { DIDMethod } from "../utils/did.js";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";

describe("DID Service", () => {
  let didService: DidService;
  const clone: (input: any) => any = (input: any) => {
    return JSON.parse(JSON.stringify(input));
  };
  const keyMaterialGenerator: (id: string) => Promise<KeyMaterialDao> = async (
    id: string
  ) => {
    const keypair = await generateKeyPair("EdDSA");
    return plainToInstance(KeyMaterialDao, {
      id: id,
      type: "EdDSA",
      default: true,
      privateKey: await exportJWK(keypair.privateKey),
      publicKey: await exportJWK(keypair.publicKey),
      caChain: undefined
    });
  };

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(RootConfig, {
      initKeys: [
        {
          id: "key-0",
          type: "EdDSA",
          default: true
        }
      ]
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([DIDDocuments, DIDService, DIDLogs]),
        TypeOrmModule.forFeature([DIDDocuments, DIDService, DIDLogs])
      ],
      providers: [
        DidService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
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

    it("Check existing DID is empty", async () => {
      await expect(
        didService.checkExistingDidDocument(
          await keyMaterialGenerator("test-key")
        )
      ).rejects.toThrow("DID Document not ready yet");
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
      createdDidWithKey = await didService.createDidDocument([
        await keyMaterialGenerator("test-key")
      ]);
      expect(createdDidWithKey).toBeDefined();
      expect(createdDidWithKey.verificationMethod).toHaveLength(1);
      expect(createdDidWithKey.assertionMethod).toHaveLength(1);
      expect(createdDidWithKey["@context"]).toEqual(
        expect.arrayContaining(["https://w3id.org/security/suites/jws-2020/v1"])
      );
      expect(createdDidWithKey.verificationMethod![0].type).toBe(
        "JsonWebKey2020"
      );
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

    it("Update DID default key", async () => {
      expect(
        await didService.setDidDefaultKey(
          await keyMaterialGenerator("test-key")
        )
      );
    });

    it("Update DID document keys", async () => {
      const prevDidDoc: DIDDocument = clone(await didService.getDid());
      expect(
        await didService.updateDidDocumentKeys([
          await keyMaterialGenerator("test-key-new")
        ])
      );
      const newDidDoc: DIDDocument = clone(await didService.getDid());
      expect(newDidDoc.verificationMethod).toHaveLength(1);
      expect(newDidDoc.verificationMethod![0].id).not.toEqual(
        prevDidDoc.verificationMethod![0].id
      );
      expect(newDidDoc.service).toHaveLength(prevDidDoc.service!.length);
      for (let i = 0; i < newDidDoc.service!.length; i++) {
        expect(newDidDoc.service![0].id).toEqual(prevDidDoc.service![0].id);
      }
    });

    it("Check existing DID exists", async () => {
      const prevDid: DIDDocument = clone(await didService.getDid());
      const existingDid = await didService.checkExistingDidDocument(
        await keyMaterialGenerator("test-key")
      );
      expect(existingDid).toBeDefined();
      expect(existingDid.id).toEqual(prevDid.id);
      expect(existingDid.verificationMethod).toEqual(
        prevDid.verificationMethod
      );
      expect(existingDid.assertionMethod).toEqual(prevDid.assertionMethod);
      expect(existingDid.service).toEqual(prevDid.service);
    });

    it("Create initial DID tdw document", async () => {
      const config = plainToInstance(RootConfig, {
        initKeys: [
          {
            id: "key-0",
            type: "EdDSA",
            default: true
          }
        ],
        did: {
          method: DIDMethod.TDW
        }
      });
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmTestHelper.instance.module([
            DIDDocuments,
            DIDService,
            DIDLogs
          ]),
          TypeOrmModule.forFeature([DIDDocuments, DIDService, DIDLogs])
        ],
        providers: [
          DidService,
          {
            provide: RootConfig,
            useValue: config
          }
        ]
      }).compile();

      const didTdwService = moduleRef.get(DidService);
      const tdwCreatedDid = await didTdwService.createDidDocument([
        await keyMaterialGenerator("test-key")
      ]);
      expect(tdwCreatedDid).toBeDefined();

      const didId = await didTdwService.getDidId();
      expect(didId.startsWith("did:tdw:localhost:")).toEqual(true);
    });
  });

  describe("DID Service management", () => {
    it("Insert service", async () => {
      const prevDidDoc: DIDDocument = clone(await didService.getDid());
      console.log(prevDidDoc.service);
      const service = await didService.insertService({
        id: "did:web:localhost#TestService",
        type: "TestService",
        serviceEndpoint: "http://localhost"
      });
      const newDidDoc: DIDDocument = clone(await didService.getDid());
      expect(service.id).toBe("did:web:localhost#TestService");
      expect(service.type).toBe("TestService");
      expect(service.serviceEndpoint).toBe("http://localhost");
      console.log(newDidDoc.service);
      expect(newDidDoc.service!.length).toEqual(prevDidDoc.service!.length + 1);
    });
    it("Insert already existing service", async () => {
      await expect(
        didService.insertService({
          id: "did:web:localhost#TestService",
          type: "TestService",
          serviceEndpoint: "http://localhost"
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
      const prevDidDoc: DIDDocument = clone(await didService.getDid());
      const service = await didService.updateService(
        "did:web:localhost#TestService",
        {
          id: "did:web:localhost#TestService",
          type: "TestService",
          serviceEndpoint: "http://localhost/service"
        }
      );
      const newDidDoc: DIDDocument = clone(await didService.getDid());
      expect(service.id).toBe("did:web:localhost#TestService");
      expect(service.type).toBe("TestService");
      expect(service.serviceEndpoint).toBe("http://localhost/service");
      expect(newDidDoc.service!.length).toEqual(prevDidDoc.service!.length);
    });
    it("Delete service", async () => {
      const prevDidDoc: DIDDocument = clone(await didService.getDid());
      await didService.deleteService("did:web:localhost#TestService");
      const newDidDoc: DIDDocument = clone(await didService.getDid());
      expect(newDidDoc.service!.length).toEqual(prevDidDoc.service!.length - 1);
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
          serviceEndpoint: "http://localhost"
        })
      ).rejects.toThrow("does not exist");
    });
  });
});

describe("DID Service Multikey-based", () => {
  let didService: DidService;
  const keyMaterialGenerator: (id: string) => Promise<KeyMaterialDao> = async (
    id: string
  ) => {
    const keypair = await generateKeyPair("EdDSA");
    return plainToInstance(KeyMaterialDao, {
      id: id,
      type: "EdDSA",
      default: true,
      privateKey: await exportJWK(keypair.privateKey),
      publicKey: await exportJWK(keypair.publicKey),
      caChain: undefined
    });
  };

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
      did: {
        keyFormat: "Multikey"
      }
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([DIDDocuments, DIDService, DIDLogs]),
        TypeOrmModule.forFeature([DIDDocuments, DIDService, DIDLogs])
      ],
      providers: [
        DidService,
        {
          provide: RootConfig,
          useValue: config
        }
      ]
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

    it("Check existing DID is empty", async () => {
      await expect(
        didService.checkExistingDidDocument(
          await keyMaterialGenerator("test-key")
        )
      ).rejects.toThrow("DID Document not ready yet");
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
      createdDidWithKey = await didService.createDidDocument([
        await keyMaterialGenerator("test-key")
      ]);
      expect(createdDidWithKey).toBeDefined();
      expect(createdDidWithKey.verificationMethod).toHaveLength(1);
      expect(createdDidWithKey.assertionMethod).toHaveLength(1);
      expect(createdDidWithKey["@context"]).toEqual(
        expect.arrayContaining(["https://w3id.org/security/multikey/v1"])
      );
      expect(createdDidWithKey.verificationMethod![0].type).toBe("Multikey");
    });
  });
});
