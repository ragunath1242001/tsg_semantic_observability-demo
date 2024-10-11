import { setupServer, SetupServer } from "msw/node";
import { DidWebResolverStrategy } from "./did.web.resolver.strategy.js";
import { http, HttpResponse } from "msw";
import { DIDDocument } from "did-resolver";
import { Test, TestingModule } from "@nestjs/testing";

describe("DID Web Resolver", () => {
  let didWebResolverStrategy: DidWebResolverStrategy;
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

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DidWebResolverStrategy],
    }).compile();
    didWebResolverStrategy = await moduleRef.get(DidWebResolverStrategy);

    server = setupServer(
      http.get("http://localhost/.well-known/did.json", () => {
        return HttpResponse.json(didGenerator("did:web:localhost"));
      }),
      http.get("https://example.com/.well-known/did.json", () => {
        return HttpResponse.json(didGenerator("did:web:example.com"));
      }),
      http.get("https://example.com/user/admin/did.json", () => {
        return HttpResponse.json(
          didGenerator("did:web:example.com:user:admin")
        );
      }),
      http.get("https://example.com/user/admin-internal/did.json", () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });

  describe("DID Web Resolvement", () => {
    it("Resolve main DID", async () => {
      const didDocument = await didWebResolverStrategy.resolve(
        "did:web:example.com"
      );
      expect(didDocument).toEqual(didGenerator("did:web:example.com"));
    });
    it("Resolve localhost main DID", async () => {
      const didDocument = await didWebResolverStrategy.resolve(
        "did:web:localhost"
      );
      expect(didDocument).toEqual(didGenerator("did:web:localhost"));
    });
    it("Resolve subdirectory DID", async () => {
      const didDocument = await didWebResolverStrategy.resolve(
        "did:web:example.com:user:admin"
      );
      expect(didDocument).toEqual(
        didGenerator("did:web:example.com:user:admin")
      );
    });
    it("Resolve non existing DID", async () => {
      await expect(
        didWebResolverStrategy.resolve(
          "did:web:example.com:user:admin-internal"
        )
      ).rejects.toThrow("Could not load DID document for");
    });
  });
});
