import { plainToInstance } from "class-transformer";
import { DidServiceConfig, RootConfig } from "../../config.js";
import { DidTdwStrategy } from "./did.tdw.strategy.js";
import { KeyMaterials } from "../../model/credentials.dao.js";
import { exportJWK, generateKeyPair } from "jose";
import { TypeOrmTestHelper } from "../../utils/testhelper.js";
import { Test, TestingModule } from "@nestjs/testing";
import { DIDLogs } from "../../model/did.dao.js";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { jest } from "@jest/globals";
import { DIDDocument } from "did-resolver";
import {
  createServices,
  createVerificationMethods,
  DIDMethod
} from "../../utils/did.js";
import { jwkToMultibase } from "../../utils/keys/keyconverter.js";

describe("DID Tdw Service", () => {
  let didTdwStrategy: DidTdwStrategy;
  let didLogsRepository: Repository<DIDLogs>;
  let didLogs: DIDLogs[] = [];
  const config: RootConfig = plainToInstance(RootConfig, {
    server: {
      publicDomain: "localhost:3000",
      publicAddress: "http://localhost:3000"
    }
  });
  let didId: string = "did:tdw:localhost%3A3000:{SCID}";
  const keyMaterialGenerator: () => Promise<KeyMaterials> = async () => {
    const keyPair = await generateKeyPair("EdDSA");
    return plainToInstance(KeyMaterials, {
      id: "test-key",
      type: "EdDSA",
      default: true,
      privateKey: await exportJWK(keyPair.privateKey),
      publicKey: await exportJWK(keyPair.publicKey),
      caChain: undefined
    });
  };
  const serviceGenerator: () => DidServiceConfig = () => {
    return plainToInstance(DidServiceConfig, {
      id: `${didId}#test`,
      type: "Test",
      serviceEndpoint: config.server.publicAddress
    });
  };
  const mockDidLogsRepository = () => ({
    find: jest.fn(),
    save: jest.fn(),
    clear: jest.fn()
  });

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DidTdwStrategy,
        {
          provide: getRepositoryToken(DIDLogs),
          useValue: mockDidLogsRepository()
        }
      ]
    }).compile();
    didTdwStrategy = await moduleRef.get(DidTdwStrategy);
    didLogsRepository = await moduleRef.get(getRepositoryToken(DIDLogs));
  });

  describe("DID Tdw Document testing", () => {
    let completeDidDocument: DIDDocument;

    it("Create initial DID", () => {
      expect(didTdwStrategy.createDid(config)).toEqual(didId);
    });

    it("Create initial DID document without key", async () => {
      await expect(
        didTdwStrategy.createDidDocument(config, didId, [], [])
      ).rejects.toThrow("Keys not supplied for DID document creation");
    });

    it("Create initial DID document with key and service", async () => {
      const res = await didTdwStrategy.createDidDocument(
        config,
        didId,
        [await keyMaterialGenerator()],
        [serviceGenerator()]
      );
      expect(res).toBeDefined();
      didId = res.didId;
      expect(res.didDocument.id).toEqual(didId);
      expect(res.didDocument.verificationMethod).toHaveLength(1);
      expect(res.didDocument.assertionMethod).toHaveLength(1);
      expect(res.didDocument.service).toHaveLength(1);
      completeDidDocument = res.didDocument;
    });

    it("Create initial DID document without default key", async () => {
      let keyMaterial = await keyMaterialGenerator();
      keyMaterial.default = false;
      const res = await didTdwStrategy.createDidDocument(
        config,
        didId,
        [keyMaterial],
        [serviceGenerator()]
      );
      expect(res).toBeDefined();
      didId = res.didId;
      expect(res.didDocument.id).toEqual(didId);
      expect(res.didDocument.verificationMethod).toHaveLength(1);
      expect(res.didDocument.assertionMethod).toHaveLength(1);
      expect(res.didDocument.service).toHaveLength(1);
      completeDidDocument = res.didDocument;
    });

    it("Create DID and save DID log", async () => {
      const res = await didTdwStrategy.createDidDocAndSaveLog(
        config,
        didId,
        [await keyMaterialGenerator()],
        [serviceGenerator()]
      );
      expect(res).toBeDefined();
      didId = res.did;
      expect(res.doc.id).toEqual(didId);
      expect(res.doc.verificationMethod).toHaveLength(1);
      expect(res.doc.assertionMethod).toHaveLength(1);
      expect(res.doc.service).toHaveLength(1);
      expect(res.log).toHaveLength(1);
      completeDidDocument = res.doc;

      didLogs = [
        {
          id: 1,
          scid: res.log[0][3].scid!,
          logEntry: res.log[0],
          created: new Date(),
          modified: new Date(),
          deleted: new Date()
        }
      ];
      jest.spyOn(didLogsRepository, "find").mockResolvedValue(didLogs);
    });

    it("Get DID Log", async () => {
      expect(await didTdwStrategy.getDidLog(didLogs[0].scid)).toEqual(
        JSON.stringify(didLogs[0].logEntry)
      );
    });

    it("Get empty DID Log", async () => {
      jest.spyOn(didLogsRepository, "find").mockResolvedValueOnce([]);
      await expect(didTdwStrategy.getDidLog(didLogs[0].scid)).rejects.toThrow(
        "DID Logs not ready yet"
      );
    });

    it("Update non-existing DID document", async () => {
      jest.spyOn(didLogsRepository, "find").mockResolvedValueOnce([]);
      await expect(
        didTdwStrategy.updateDidDocument(completeDidDocument, [], [])
      ).rejects.toThrow("DID Document not ready yet");
    });

    it("Update DID document", async () => {
      let keyMaterial = await keyMaterialGenerator();
      keyMaterial.id = "test-key-1";
      const updatedDidDocument = await didTdwStrategy.updateDidDocument(
        completeDidDocument,
        createVerificationMethods(didId, [keyMaterial]),
        createServices([
          plainToInstance(DidServiceConfig, {
            id: `${didId}#test-1`,
            type: "Test",
            serviceEndpoint: config.server.publicAddress
          })
        ])
      );
      expect(updatedDidDocument).toBeDefined();
      expect(updatedDidDocument.id).toEqual(didId);
      expect(updatedDidDocument.verificationMethod).toHaveLength(1);
      expect(updatedDidDocument.verificationMethod![0].id).not.toEqual(
        completeDidDocument.verificationMethod![0].id
      );
      expect(updatedDidDocument.assertionMethod).toHaveLength(1);
      expect(updatedDidDocument.assertionMethod![0]).not.toEqual(
        completeDidDocument.assertionMethod![0]
      );
      expect(updatedDidDocument.service).toHaveLength(1);
      expect(updatedDidDocument.service![0].id).not.toEqual(
        completeDidDocument.service![0].id
      );
    });

    it("Update DID document to empty key and service", async () => {
      const updatedDidDocument = await didTdwStrategy.updateDidDocument(
        completeDidDocument,
        [],
        []
      );
      expect(updatedDidDocument).toBeDefined();
      expect(updatedDidDocument.id).toEqual(didId);
      expect(updatedDidDocument.verificationMethod).toBeUndefined();
      expect(updatedDidDocument.assertionMethod).toBeUndefined();
      expect(updatedDidDocument.service).toHaveLength(0);
    });

    it("Update DID document to undefined key and service", async () => {
      const updatedDidDocument = await didTdwStrategy.updateDidDocument(
        completeDidDocument,
        undefined,
        undefined
      );
      expect(updatedDidDocument).toBeDefined();
      expect(updatedDidDocument.id).toEqual(didId);
      expect(updatedDidDocument.verificationMethod).toBeUndefined();
      expect(updatedDidDocument.assertionMethod).toBeUndefined();
      expect(updatedDidDocument.service).toBeUndefined();
    });

    it("Update DID default key", async () => {
      const newDefaultKey = await keyMaterialGenerator();
      expect(
        await didTdwStrategy.setDefaultKey(completeDidDocument, newDefaultKey)
      ).resolves;
      const currUpdateKey = didTdwStrategy.getCurrUpdateKey();
      expect(currUpdateKey.publicKeyMultibase).toEqual(
        jwkToMultibase(newDefaultKey.publicKey)
      );
      expect(currUpdateKey.secretKeyMultibase).toEqual(
        jwkToMultibase(newDefaultKey.privateKey, true)
      );
      expect(currUpdateKey.type).toEqual("EdDSA");
    });

    it("Get .well-known path DID document", async () => {
      const newDidDocument =
        didTdwStrategy.getWellKnownDidDocument(completeDidDocument);
      expect(newDidDocument.id).toEqual(
        didId.replace(DIDMethod.TDW, DIDMethod.WEB)
      );
      expect(newDidDocument.alsoKnownAs).toBeDefined();
      expect(newDidDocument.alsoKnownAs).toHaveLength(1);
      expect(newDidDocument.alsoKnownAs![0]).toEqual(didId);
    });

    it("Get .well-known path DID document with alsoKnownAs", async () => {
      completeDidDocument.alsoKnownAs = ["did:web:example.com"];
      const newDidDocument =
        didTdwStrategy.getWellKnownDidDocument(completeDidDocument);
      expect(newDidDocument.id).toEqual(
        didId.replace(DIDMethod.TDW, DIDMethod.WEB)
      );
      expect(newDidDocument.alsoKnownAs).toBeDefined();
      expect(newDidDocument.alsoKnownAs).toHaveLength(2);
      expect(newDidDocument.alsoKnownAs![0]).toEqual("did:web:example.com");
      expect(newDidDocument.alsoKnownAs![1]).toEqual(didId);
    });
  });
});
