import { DIDDocument } from "did-resolver";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveDid } from "./did.resolver.js";

describe("DID Service", () => {
  let server: SetupServer;
  const didGenerator: (didId: string) => DIDDocument = (didId: string) => {
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/"
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
            x: "51eFT_VcIKhmugYwgohttFjY9jqSZK-L8FcwTiPMGzA"
          }
        }
      ],
      assertionMethod: [`${didId}#test-key`]
    };
  };
  const didLog: string = JSON.stringify([
    "b6okhmcu4qfy3bibshi7rsfwzafmiruxvyhotg22d3tbaqjrj7aga",
    1,
    "2024-08-14T15:06:52Z",
    {
      method: "did:tdw:1",
      scid: "bwrrlevohy72zhnvmuvuvkkavzgr",
      updateKeys: ["z6MktyEcvgvQo2TPwb3BxcSrmx1FEFs3cvwF4Qe8MovdbkYM"]
    },
    {
      value: {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
        controller: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
        assertionMethod: [
          "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0"
        ],
        verificationMethod: [
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0",
            controller: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
            type: "JsonWebKey2020",
            publicKeyJwk: {
              kty: "OKP",
              alg: "EdDSA",
              crv: "Ed25519",
              x: "17FuANfb0PjxiR5iiixheempqgUmp3HPFfM1zq3WtFY"
            }
          }
        ],
        service: [
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#oid4vci",
            type: "OID4VCI",
            serviceEndpoint: "http://localhost:3000"
          },
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#presentation",
            type: "PresentationService",
            serviceEndpoint:
              "http://localhost:3000/api/iatp/holder/presentation"
          }
        ]
      }
    },
    [
      {
        type: "DataIntegrityProof",
        cryptosuite: "eddsa-jcs-2022",
        verificationMethod: "z6MktyEcvgvQo2TPwb3BxcSrmx1FEFs3cvwF4Qe8MovdbkYM",
        created: "2024-08-14T15:06:52Z",
        proofPurpose: "authentication",
        challenge: "b6okhmcu4qfy3bibshi7rsfwzafmiruxvyhotg22d3tbaqjrj7aga",
        proofValue:
          "zDJwQNLB4ABV63ETmMyPXsuBNHDYfvPsvYV1wjpVjNebhBCyhw2yDVLXisNbnUTrKcamQSUkUYRoYyyvhC3cgaTr"
      }
    ]
  ]);

  beforeAll(async () => {
    server = setupServer(
      http.get("http://localhost:3000/.well-known/did.json", () => {
        return HttpResponse.json(didGenerator("did:web:localhost%3A3000"));
      }),
      http.get(
        "http://localhost:3000/bwrrlevohy72zhnvmuvuvkkavzgr/did.jsonl",
        () => {
          return HttpResponse.json(didLog);
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });

  describe("DID Resolvement", () => {
    it("Non supported DID resolvement", async () => {
      await expect(
        resolveDid("did:keri:EXq5YqaL6L48pf0fu7IUhL0JRaU2_RxFP0AL43wYn148")
      ).rejects.toThrow("Resolver does not support the did:keri: method");
    });
    it("Resolve DID Web", async () => {
      const didDocument = await resolveDid("did:web:localhost%3A3000");
      expect(didDocument).toEqual(didGenerator("did:web:localhost%3A3000"));
    });
    it("Resolve DID Tdw", async () => {
      const didDocument = await resolveDid(
        "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr"
      );
      expect(didDocument).toEqual({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
        controller: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
        assertionMethod: [
          "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0"
        ],
        verificationMethod: [
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0",
            controller: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
            type: "JsonWebKey2020",
            publicKeyJwk: {
              kty: "OKP",
              alg: "EdDSA",
              crv: "Ed25519",
              x: "17FuANfb0PjxiR5iiixheempqgUmp3HPFfM1zq3WtFY"
            }
          }
        ],
        service: [
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#oid4vci",
            type: "OID4VCI",
            serviceEndpoint: "http://localhost:3000"
          },
          {
            id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#presentation",
            type: "PresentationService",
            serviceEndpoint:
              "http://localhost:3000/api/iatp/holder/presentation"
          }
        ]
      });
    });
  });
});
