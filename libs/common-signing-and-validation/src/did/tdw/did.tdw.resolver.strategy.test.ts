import { setupServer, SetupServer } from "msw/node";
import { DidTdwResolverStrategy } from "./did.tdw.resolver.strategy.js";
import { http, HttpResponse } from "msw";
import { Test, TestingModule } from "@nestjs/testing";

describe("DID Tdw Resolver", () => {
  let didTdwResolverStrategy: DidTdwResolverStrategy;
  let server: SetupServer;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DidTdwResolverStrategy]
    }).compile();
    didTdwResolverStrategy = await moduleRef.get(DidTdwResolverStrategy);

    server = setupServer(
      http.get(
        "https://example.com/bbrk2snhywl5tchhheco7lur6qpb/did.jsonl",
        () => {
          return HttpResponse.json([
            "bpi76zcm2arwegcw4xclid6boeuyyy2mz5dmmlg6xjzejzdoejgha",
            1,
            "2024-08-14T15:02:42Z",
            {
              method: "did:tdw:1",
              scid: "bbrk2snhywl5tchhheco7lur6qpb",
              updateKeys: ["z6MkrYBJwsthC1s4gZShGf2sfeg1obzjhMhkC99WfvQMpd4i"]
            },
            {
              value: {
                "@context": [
                  "https://www.w3.org/ns/did/v1",
                  "https://w3id.org/security/suites/jws-2020/v1"
                ],
                id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
                controller: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
                assertionMethod: [
                  "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#key-0"
                ],
                verificationMethod: [
                  {
                    id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#key-0",
                    controller:
                      "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
                    type: "JsonWebKey2020",
                    publicKeyJwk: {
                      kty: "OKP",
                      alg: "EdDSA",
                      crv: "Ed25519",
                      x: "s47LAif3eseCBQlcBuyB1Uo7CgHLo0efYpddvqll7R8"
                    }
                  }
                ],
                service: [
                  {
                    id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#oid4vci",
                    type: "OID4VCI",
                    serviceEndpoint: "http://localhost:3000"
                  },
                  {
                    id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#presentation",
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
                verificationMethod:
                  "z6MkrYBJwsthC1s4gZShGf2sfeg1obzjhMhkC99WfvQMpd4i",
                created: "2024-08-14T15:02:42Z",
                proofPurpose: "authentication",
                challenge:
                  "bpi76zcm2arwegcw4xclid6boeuyyy2mz5dmmlg6xjzejzdoejgha",
                proofValue:
                  "z5s4EZvvHanJDa7zrQ7qMbCyC9vsd8RPnZnQEB4EK5PTyEsBsJXrEWGBnXEsvk5gPTjXttheGyaamA14DndcEFwh5"
              }
            ]
          ]);
        }
      ),
      http.get(
        "http://localhost:3000/bwrrlevohy72zhnvmuvuvkkavzgr/did.jsonl",
        () => {
          return HttpResponse.json([
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
                controller:
                  "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
                assertionMethod: [
                  "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0"
                ],
                verificationMethod: [
                  {
                    id: "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr#key-0",
                    controller:
                      "did:tdw:localhost%3A3000:bwrrlevohy72zhnvmuvuvkkavzgr",
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
                verificationMethod:
                  "z6MktyEcvgvQo2TPwb3BxcSrmx1FEFs3cvwF4Qe8MovdbkYM",
                created: "2024-08-14T15:06:52Z",
                proofPurpose: "authentication",
                challenge:
                  "b6okhmcu4qfy3bibshi7rsfwzafmiruxvyhotg22d3tbaqjrj7aga",
                proofValue:
                  "zDJwQNLB4ABV63ETmMyPXsuBNHDYfvPsvYV1wjpVjNebhBCyhw2yDVLXisNbnUTrKcamQSUkUYRoYyyvhC3cgaTr"
              }
            ]
          ]);
        }
      ),
      http.get(
        "https://example.com/user/admin/bn3infyofwtaseoxmggnm5ikwiyy/did.jsonl",
        () => {
          return HttpResponse.json([
            "barhcfb7kpot6tok7z7mlicrnlezt4wmihkds76tvcw3efxuclsvq",
            1,
            "2024-08-14T15:08:36Z",
            {
              method: "did:tdw:1",
              scid: "bn3infyofwtaseoxmggnm5ikwiyy",
              updateKeys: ["z6MkqLaJovzf891d3weCPyHjA9mzf7NK6JxMkzEKJYikcnYP"]
            },
            {
              value: {
                "@context": [
                  "https://www.w3.org/ns/did/v1",
                  "https://w3id.org/security/suites/jws-2020/v1"
                ],
                id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
                controller:
                  "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
                assertionMethod: [
                  "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#key-0"
                ],
                verificationMethod: [
                  {
                    id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#key-0",
                    controller:
                      "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
                    type: "JsonWebKey2020",
                    publicKeyJwk: {
                      kty: "OKP",
                      alg: "EdDSA",
                      crv: "Ed25519",
                      x: "obojzxETHGNHC-5gzWCn0UH4wPZgqw4qL8qY7v0jRng"
                    }
                  }
                ],
                service: [
                  {
                    id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#oid4vci",
                    type: "OID4VCI",
                    serviceEndpoint: "http://localhost:3000"
                  },
                  {
                    id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#presentation",
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
                verificationMethod:
                  "z6MkqLaJovzf891d3weCPyHjA9mzf7NK6JxMkzEKJYikcnYP",
                created: "2024-08-14T15:08:36Z",
                proofPurpose: "authentication",
                challenge:
                  "barhcfb7kpot6tok7z7mlicrnlezt4wmihkds76tvcw3efxuclsvq",
                proofValue:
                  "z5Bj7akX7KHLxLqUscFWYeeMZHZx4j1AyY57SuG5bXRCRmuRZExYPwTewFXe5sU1oVeqp4erFp4gqfj8zHT4V4RPT"
              }
            ]
          ]);
        }
      ),
      http.get("https://example.com/user/admin-internal/did.jsonl", () => {
        return new HttpResponse(null, { status: 404 });
      }),
      http.get(
        "http://localhost:3000/bnlj46g5hfc4sljstitrqj2ltyvi/did.jsonl",
        () => {
          return HttpResponse.json(
            JSON.stringify([
              "bfq7pbeekoxhfzwp4u7rvn7dncsyrmag2ky4kmuaolozyqhjs3rmq",
              1,
              "2024-08-14T15:10:44Z",
              {
                method: "did:tdw:1",
                scid: "bnlj46g5hfc4sljstitrqj2ltyvi",
                updateKeys: ["z6MktRSKtkHHMGrzm5GU5AEQM3Z7kfXUsg4EwHyET4kdpTPL"]
              },
              {
                value: {
                  "@context": [
                    "https://www.w3.org/ns/did/v1",
                    "https://w3id.org/security/suites/jws-2020/v1"
                  ],
                  id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi",
                  controller:
                    "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi",
                  assertionMethod: [
                    "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#key-0"
                  ],
                  verificationMethod: [
                    {
                      id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#key-0",
                      controller:
                        "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi",
                      type: "JsonWebKey2020",
                      publicKeyJwk: {
                        kty: "OKP",
                        alg: "EdDSA",
                        crv: "Ed25519",
                        x: "z4wUhygl8Pq4V0OLbfijfb_o1_msO0Xn2FJKq9QJYO8"
                      }
                    }
                  ],
                  service: [
                    {
                      id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#oid4vci",
                      type: "OID4VCI",
                      serviceEndpoint: "http://localhost:3000"
                    },
                    {
                      id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#presentation",
                      type: "PresentationService",
                      serviceEndpoint:
                        "http://localhost:3000/iatp/holder/presentation"
                    }
                  ]
                }
              },
              [
                {
                  type: "DataIntegrityProof",
                  cryptosuite: "eddsa-jcs-2022",
                  verificationMethod:
                    "z6MktRSKtkHHMGrzm5GU5AEQM3Z7kfXUsg4EwHyET4kdpTPL",
                  created: "2024-08-14T15:10:44Z",
                  proofPurpose: "authentication",
                  challenge:
                    "bfq7pbeekoxhfzwp4u7rvn7dncsyrmag2ky4kmuaolozyqhjs3rmq",
                  proofValue:
                    "z64svfc8VdMeH9LffVYC73SfFNQEtkUp1q38v5r8eC5NsPovL8TdNoQaj2237yPU7K55j4qLMFoeZbPXnZyn3sg7V"
                }
              ]
            ]) +
              "\n" +
              JSON.stringify([
                "b6gqcov6k765h72tbr46j7ogfgfsht4yl2l5j6ozallnil5j7u2aq",
                2,
                "2024-08-14T15:10:54Z",
                {},
                {
                  patch: [
                    {
                      op: "add",
                      path: "/service/2",
                      value: {
                        id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#test",
                        type: "Test",
                        serviceEndpoint: "https://www.localhost:3000/test"
                      }
                    },
                    {
                      op: "replace",
                      path: "/controller",
                      value: [
                        "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi"
                      ]
                    }
                  ]
                },
                [
                  {
                    type: "DataIntegrityProof",
                    cryptosuite: "eddsa-jcs-2022",
                    verificationMethod:
                      "z6MktRSKtkHHMGrzm5GU5AEQM3Z7kfXUsg4EwHyET4kdpTPL",
                    created: "2024-08-14T15:10:54Z",
                    proofPurpose: "authentication",
                    challenge:
                      "b6gqcov6k765h72tbr46j7ogfgfsht4yl2l5j6ozallnil5j7u2aq",
                    proofValue:
                      "z3bUj7Kr6LUXw1hoVdoSThNRAKbMxcBGZ23d2nvyYiN7cxQECGA15BfL2YiopwhVEA5FiAHRqnVnUd9wMvXciQEhQ"
                  }
                ]
              ])
          );
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });

  describe("DID Tdw Resolvement", () => {
    it("Resolve main DID", async () => {
      const didDocument = await didTdwResolverStrategy.resolve(
        "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb"
      );
      expect(didDocument).toEqual({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
        controller: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
        assertionMethod: [
          "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#key-0"
        ],
        verificationMethod: [
          {
            id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#key-0",
            controller: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb",
            type: "JsonWebKey2020",
            publicKeyJwk: {
              kty: "OKP",
              alg: "EdDSA",
              crv: "Ed25519",
              x: "s47LAif3eseCBQlcBuyB1Uo7CgHLo0efYpddvqll7R8"
            }
          }
        ],
        service: [
          {
            id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#oid4vci",
            type: "OID4VCI",
            serviceEndpoint: "http://localhost:3000"
          },
          {
            id: "did:tdw:example.com:bbrk2snhywl5tchhheco7lur6qpb#presentation",
            type: "PresentationService",
            serviceEndpoint:
              "http://localhost:3000/api/iatp/holder/presentation"
          }
        ]
      });
    });
    it("Resolve localhost main DID", async () => {
      const didDocument = await didTdwResolverStrategy.resolve(
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
    it("Resolve subdirectory DID", async () => {
      const didDocument = await didTdwResolverStrategy.resolve(
        "did:tdw:example.com:user:admin:bn3infyofwtaseoxmggnm5ikwiyy"
      );
      expect(didDocument).toEqual({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
        controller:
          "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
        assertionMethod: [
          "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#key-0"
        ],
        verificationMethod: [
          {
            id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#key-0",
            controller:
              "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy",
            type: "JsonWebKey2020",
            publicKeyJwk: {
              kty: "OKP",
              alg: "EdDSA",
              crv: "Ed25519",
              x: "obojzxETHGNHC-5gzWCn0UH4wPZgqw4qL8qY7v0jRng"
            }
          }
        ],
        service: [
          {
            id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#oid4vci",
            type: "OID4VCI",
            serviceEndpoint: "http://localhost:3000"
          },
          {
            id: "did:tdw:example.com/user/admin:bn3infyofwtaseoxmggnm5ikwiyy#presentation",
            type: "PresentationService",
            serviceEndpoint:
              "http://localhost:3000/api/iatp/holder/presentation"
          }
        ]
      });
    });
    it("Resolve non existing DID", async () => {
      await expect(
        didTdwResolverStrategy.resolve(
          "did:tdw:example.com:user:admin-internal"
        )
      ).rejects.toThrow("Could not load DID document for");
    });
    it("Resolve localhost main DID with multiple logs", async () => {
      const didDocument = await didTdwResolverStrategy.resolve(
        "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi"
      );
      expect(didDocument).toEqual({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi",
        controller: ["did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi"],
        assertionMethod: [
          "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#key-0"
        ],
        verificationMethod: [
          {
            id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#key-0",
            controller: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi",
            type: "JsonWebKey2020",
            publicKeyJwk: {
              kty: "OKP",
              alg: "EdDSA",
              crv: "Ed25519",
              x: "z4wUhygl8Pq4V0OLbfijfb_o1_msO0Xn2FJKq9QJYO8"
            }
          }
        ],
        service: [
          {
            id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#oid4vci",
            type: "OID4VCI",
            serviceEndpoint: "http://localhost:3000"
          },
          {
            id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#presentation",
            type: "PresentationService",
            serviceEndpoint: "http://localhost:3000/iatp/holder/presentation"
          },
          {
            id: "did:tdw:localhost%3A3000:bnlj46g5hfc4sljstitrqj2ltyvi#test",
            type: "Test",
            serviceEndpoint: "https://www.localhost:3000/test"
          }
        ]
      });
    });
  });
});
