import { plainToInstance } from "class-transformer";
import { DIDDocument } from "did-resolver";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { IamConfig, TsgWalletConfig } from "../../config.js";

export function mockWalletConfig(): IamConfig {
  return plainToInstance<TsgWalletConfig, TsgWalletConfig>(TsgWalletConfig, {
    type: "tsg",
    didId: "did:web:localhost%3A3000",
    walletUrl: "http://127.0.0.1",
    siopUrl: "http://127.0.0.1/management/dcp/holder/token",
    verifyUrl: "http://127.0.0.1/management/dcp/verifier/verify",
    typeFilter: "VerifiableCredential",
    issuerFilter: "did:web:localhost%3A3000",
    protocol: "DUMMY",
    version: "0.1",
    profile: []
  });
}

export function mockDidDocument(): DIDDocument {
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/dspace-dcp/v1.0/dcp.jsonld",
      "https://w3c-ccg.github.io/lds-jws2020/contexts/v1/"
    ],
    id: "did:web:localhost",
    verificationMethod: [
      {
        id: "did:web:localhost#key-0",
        type: "JsonWebKey2020",
        controller: "did:web:localhost",
        publicKeyJwk: {
          kty: "OKP",
          alg: "EdDSA",
          crv: "Ed25519",
          x: "Hwltj2aq8ig-VBF5GZJQPlwz6PrxGXpG2rLX0oYwYeg"
        }
      }
    ],
    assertionMethod: ["did:web:localhost#key-0"],
    service: [
      {
        id: "did:web:localhost#credentialservice",
        type: "CredentialService",
        serviceEndpoint: "http://localhost"
      },
      {
        id: "did:web:localhost",
        type: "connector",
        serviceEndpoint: "http://localhost"
      }
    ]
  };
}

export function sampleVpToken(): string {
  return "eyJhbGciOiJFZERTQSJ9.eyJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdzNjLmdpdGh1Yi5pby92Yy1qd3MtMjAyMC9jb250ZXh0cy92MS8iXSwiQHR5cGUiOlsiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiJdLCJ2ZXJpZmlhYmxlQ3JlZGVudGlhbCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdzNjLmdpdGh1Yi5pby92Yy1qd3MtMjAyMC9jb250ZXh0cy92MS8iLCJodHRwczovL3dhbGxldC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzL2NvbnRleHQvU0NTTiJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiU0NTTkNyZWRlbnRpYWwiXSwiaWQiOiJkaWQ6d2ViOndhbGxldC1jYXRlbmEteC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzIzkwMjc3NDgxLTg5ZmMtNDdjMS05ZmNiLTdhYmJiZTVhYWM2ZSIsImlzc3VlciI6ImRpZDp3ZWI6d2FsbGV0LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJpc3N1YW5jZURhdGUiOiIyMDIzLTA4LTMwVDE1OjA4OjM5LjM0MFoiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjMtMTEtMzBUMTU6MDg6MzkuMzQwWiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOndlYjp3YWxsZXQtY2F0ZW5hLXguYWxwaGEuc2Nzbi5kYXRhc3BhYy5lcyIsInNjc25JZGVudGlmaWVyIjoidXJuOnNjc246MjM0NTY3ODkwMTIzNDUiLCJzY3NuUm9sZSI6InNjc246U2VydmljZVByb3ZpZGVyIn0sInByb29mIjp7InR5cGUiOiJKc29uV2ViU2lnbmF0dXJlMjAyMCIsImNyZWF0ZWQiOiIyMDIzLTA4LTMwVDE1OjA4OjM5Ljg4N1oiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJqd3MiOiJleUpoYkdjaU9pSkZaRVJUUVNJc0ltSTJOQ0k2Wm1Gc2MyVXNJbU55YVhRaU9sc2lZalkwSWwxOS4uY2QyZUtRMGVDUUpDa3FMVm1FSFpfcHFXX21tNXdrT0l6YU0xYkI0RnBoSUtTYUlFSmhFVTRmSEtIR21zZFZGSHBUZG1ndlE0ZTUyWW9mQTAwdWp2QWciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6d2ViOndhbGxldC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzI2tleS0wIn19fSwiaWF0IjoxNjkzNDI0NTY3LCJpc3MiOiJkaWQ6d2ViOndhbGxldC1jYXRlbmEteC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzIiwic3ViIjoiZGlkOndlYjp3YWxsZXQuYWxwaGEuc2Nzbi5kYXRhc3BhYy5lcyIsImF1ZCI6ImRpZDp3ZWI6QVVESUVOQ0UiLCJleHAiOjE2OTM1MTA5NjcsImp0aSI6IjVhMDYwMDRlLTJkMzktNGNjZC1hMGM0LWNmOGQzNmEyODdiZSJ9.UkVNT1ZFRF9TSUdOQVRVUkU";
}

export function setupMockWalletServer(start: boolean = true): SetupServer {
  const server = setupServer(
    http.post("http://127.0.0.1/auth/login", () => {
      return HttpResponse.json({
        access_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
        refresh_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTQwMjg1ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU"
      });
    }),
    http.get("http://127.0.0.1/management/dcp/holder/token", () => {
      return HttpResponse.json({
        id_token:
          "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0JTNBMzAwMCNrZXktMCJ9.eyJhdWQiOiJkaWQ6d2ViOmxvY2FsaG9zdCUzQTMwMDAiLCJ0b2tlbiI6IjliYjU0YjliMmM3YWI0NjBjZTc2MGRjOTQ4OWUxNTBmZDU5NzE3NWY1OTJmYWM0N2YyZmMyMzg4ZTJmYzVkYjEyYWE4MzRhYTAxOGJjZDcyNTRmYTRhNWIzZjBiMjk1YyIsImlhdCI6MTcxMTcxNzgzMSwiaXNzIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzMDAwIiwic3ViIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzMDAwIiwianRpIjoiMDI2MDI4YTctZGE1Mi00M2Q2LTlhYzYtYWNhMTE3ZWRhYWFhIiwiZXhwIjoxNzExNzE4MTMxfQ.Aif9GVz9fwmQxrJP58PUH6FXAUZxwCWy_JFSy8-Pk7Ud2qksKqM3v42oKfQywO108MkwaQ95N_hlj-n562PPDw"
      });
    }),
    http.post("http://127.0.0.1/management/dcp/verifier/verify", () => {
      return HttpResponse.json([
        {
          "@context": [
            "https://www.w3.org/ns/credentials/v2",
            "https://w3c.github.io/vc-jws-2020/contexts/v1/"
          ],
          type: ["VerifiablePresentation"],
          id: "did:web:localhost%3A3000#c4c5c4c6-e1c8-44d9-8745-a1ce8f55c13d",
          verifiableCredential: [
            {
              "@context": [
                "https://www.w3.org/ns/credentials/v2",
                "https://w3c.github.io/vc-jws-2020/contexts/v1/"
              ],
              type: ["VerifiableCredential"],
              id: "did:web:localhost%3A3000#test",
              issuer: "did:web:localhost%3A3000",
              validFrom: "2024-03-29T08:17:00.122Z",
              validUntil: "2024-06-29T08:17:00.122Z",
              credentialSubject: {
                id: "did:web:localhost%3A3000"
              },
              proof: {
                type: "DataIntegrityProof",
                created: "2024-07-30T13:51:30.581Z",
                proofPurpose: "assertionMethod",
                verificationMethod:
                  "did:web:dataspace-authority.example.com#key-0",
                cryptosuite: "eddsa-jcs-2022",
                proofValue:
                  "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
              }
            }
          ]
        }
      ]);
    }),
    http.get("http://127.0.0.1/management/credentials/dataspace", () => {
      return HttpResponse.json([
        {
          created: "2024-03-18T10:53:21.000Z",
          modified: "2024-03-18T10:53:21.000Z",
          deleted: null,
          id: "did:web:localhost#test-init-credential",
          targetDid: "did:web:localhost",
          credential: {
            "@context": [
              "https://www.w3.org/ns/credentials/v2",
              "https://w3c.github.io/vc-jws-2020/contexts/v1/"
            ],
            type: ["VerifiableCredential"],
            id: "did:web:localhost#test-init-credential",
            issuer: "did:web:localhost",
            validFrom: "2024-03-18T10:53:21.231Z",
            validUntil: "2024-06-18T09:53:21.231Z",
            credentialSubject: {
              id: "did:web:localhost"
            },
            proof: {
              type: "DataIntegrityProof",
              created: "2024-07-30T13:51:30.581Z",
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:web:dataspace-authority.example.com#key-0",
              cryptosuite: "eddsa-jcs-2022",
              proofValue:
                "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
            }
          },
          selfIssued: true
        }
      ]);
    }),
    http.get(`http://localhost/.well-known/did.json`, () => {
      return HttpResponse.json(mockDidDocument());
    })
  );
  if (start) {
    server.listen({
      onUnhandledRequest: "warn"
    });
  }
  return server;
}

describe("Util Test", () => {
  it("Empty util test", () => {});
});
