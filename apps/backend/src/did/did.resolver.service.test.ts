import { DidResolverService } from "./did.resolver.service.js";
import { describe, expect, beforeAll, afterAll, it } from "@jest/globals";
import { TestingModule, Test } from "@nestjs/testing";
import { SetupServer, setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { DIDDocument } from "did-resolver";

describe("DID Service", () => {
  let didResolver: DidResolverService;
  let server: SetupServer;
  const didGenerator: (didId: string) => DIDDocument = (didId: string) => {
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/",
      ],
      id: didId,
      verificationMethod: [
        {
          id: `${didId}#test-key`,
          type: "JsonWebKey2020",
          controller: didId,
          publicKeyJwk: {
            kty: "OKP",
            alg: "EdDSA",
            crv: "Ed25519",
            x: "51eFT_VcIKhmugYwgohttFjY9jqSZK-L8FcwTiPMGzA",
          },
        },
      ],
      assertionMethod: [`${didId}#test-key`],
    };
  };
  const subDirectoryDid: DIDDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/",
    ],
    id: "did:web:example.com:user:admin",
    verificationMethod: [
      {
        id: "did:web:example.com:user:admin#test-key",
        type: "JsonWebKey2020",
        controller: "did:web:example.com:user:admin",
        publicKeyJwk: {
          kty: "OKP",
          alg: "EdDSA",
          crv: "Ed25519",
          x: "51eFT_VcIKhmugYwgohttFjY9jqSZK-L8FcwTiPMGzA",
        },
      },
    ],
    assertionMethod: ["did:web:example.com:user:admin#test-key"],
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DidResolverService],
    }).compile();
    didResolver = await moduleRef.get(DidResolverService);

    server = setupServer(
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json(didGenerator('did:web:localhost'));
      }),
      http.get("https://example.com/.well-known/did.json", () => {
        return HttpResponse.json(didGenerator('did:web:example.com'));
      }),
      http.get("https://example.com/user/admin/did.json", () => {
        return HttpResponse.json(didGenerator('did:web:example.com:user:admin'));
      }),
      http.get("https://example.com/user/admin-internal/did.json", () => {
        return new HttpResponse(null, { status: 404 })
      })
    );

    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });

  describe("DID Resolvement", () => {
    it("Non DID web resolvement", async () => {
      await expect(
        didResolver.resolve(
          "did:keri:EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148"
        )
      ).rejects.toThrow("Resolver only supports did:web");
    });
    it("Resolve main DID", async () => {
      const didDocument = await didResolver.resolve("did:web:example.com");
      expect(didDocument).toEqual(didGenerator('did:web:example.com'));
    });
    it("Resolve localhost main DID", async () => {
      const didDocument = await didResolver.resolve("did:web:localhost");
      expect(didDocument).toEqual(didGenerator('did:web:localhost'));
    });
    it("Resolve subdirectory DID", async () => {
      const didDocument = await didResolver.resolve("did:web:example.com:user:admin");
      expect(didDocument).toEqual(didGenerator('did:web:example.com:user:admin'));
    });
    it("Resolve non existing DID", async () => {
      await expect(
        didResolver.resolve(
          "did:web:example.com:user:admin-internal"
        )
      ).rejects.toThrow("Could not load DID document for");
    })
  });
});
