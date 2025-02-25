import { DidWebStrategy } from "./did.web.strategy.js";
import { DidServiceConfig, RootConfig } from "../../config.js";
import { plainToInstance } from "class-transformer";
import { KeyMaterialDao } from "../../model/credentials.dao.js";
import { exportJWK, generateKeyPair } from "jose";
import { DIDDocument } from "did-resolver";
import { createServices, createVerificationMethods } from "../../utils/did.js";
import { Test, TestingModule } from "@nestjs/testing";

describe("DID Web Service", () => {
  let didWebStrategy: DidWebStrategy;
  const config: RootConfig = plainToInstance(RootConfig, {
    server: {
      publicDomain: "localhost:3000",
      publicAddress: "http://localhost:3000"
    }
  });
  const didId: string = "did:web:localhost%3A3000";
  const keyMaterialGenerator: () => Promise<KeyMaterialDao> = async () => {
    const keyPair = await generateKeyPair("EdDSA", { extractable: true });
    return plainToInstance(KeyMaterialDao, {
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DidWebStrategy]
    }).compile();
    didWebStrategy = await moduleRef.get(DidWebStrategy);
  });

  describe("DID Web Document testing", () => {
    let emptyDidDocument: DIDDocument;
    let completeDidDocument: DIDDocument;

    it("Create initial DID", () => {
      expect(didWebStrategy.createDid(config)).toEqual(didId);
    });

    it("Create initial DID document", async () => {
      const res = await didWebStrategy.createDidDocument(config, didId, [], []);
      expect(res).toBeDefined();
      expect(res.didId).toEqual(didId);
      expect(res.didDocument.id).toEqual(didId);
      expect(res.didDocument.verificationMethod).toHaveLength(0);
      expect(res.didDocument.assertionMethod).toHaveLength(0);
      expect(res.didDocument.service).toHaveLength(0);
      emptyDidDocument = res.didDocument;
    });

    it("Create initial DID document with key and service", async () => {
      const res = await didWebStrategy.createDidDocument(
        config,
        didId,
        [await keyMaterialGenerator()],
        [serviceGenerator()]
      );
      expect(res).toBeDefined();
      expect(res.didId).toEqual(didId);
      expect(res.didDocument.id).toEqual(didId);
      expect(res.didDocument.verificationMethod).toHaveLength(1);
      expect(res.didDocument.assertionMethod).toHaveLength(1);
      expect(res.didDocument.service).toHaveLength(1);
      completeDidDocument = res.didDocument;
    });

    it("Update DID document", async () => {
      const updatedDidDocument = await didWebStrategy.updateDidDocument(
        emptyDidDocument,
        createVerificationMethods(didId, [await keyMaterialGenerator()], "JWK"),
        createServices([serviceGenerator()])
      );
      expect(updatedDidDocument).toBeDefined();
      expect(updatedDidDocument.id).toEqual(didId);
      expect(updatedDidDocument.verificationMethod).toHaveLength(1);
      expect(updatedDidDocument.assertionMethod).toHaveLength(1);
      expect(updatedDidDocument.service).toHaveLength(1);
    });

    it("Update DID document to empty key and service", async () => {
      const updatedDidDocument = await didWebStrategy.updateDidDocument(
        completeDidDocument,
        [],
        []
      );
      expect(updatedDidDocument).toBeDefined();
      expect(updatedDidDocument.id).toEqual(didId);
      expect(updatedDidDocument.verificationMethod).toHaveLength(0);
      expect(updatedDidDocument.assertionMethod).toHaveLength(0);
      expect(updatedDidDocument.service).toHaveLength(0);
    });

    it("Update DID document to undefined key and service", async () => {
      const updatedDidDocument = await didWebStrategy.updateDidDocument(
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
      expect(
        await didWebStrategy.setDefaultKey(
          completeDidDocument,
          await keyMaterialGenerator()
        )
      );
    });

    it("Get .well-known path DID Document", async () => {
      expect(
        didWebStrategy.getWellKnownDidDocument(completeDidDocument)
      ).toEqual(completeDidDocument);
    });
  });
});
