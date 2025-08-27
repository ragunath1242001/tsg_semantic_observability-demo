import { AuthClientService, AuthConfig } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { TsgWalletConfig } from "../../config.js";
import { TsgWalletClient } from "./tsg.wallet.js";
import { mockDidDocument } from "./wallet.util.test.js";

describe("TSG Wallet", () => {
  let server: SetupServer;
  beforeAll(async () => {
    server = setupServer(
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
        return HttpResponse.json([{}]);
      }),
      http.post<PathParams, Record<string, any>>(
        "http://127.0.0.1/management/signature/sign",
        async ({ request }) => {
          const body = await request.json();
          if (Object.keys(body.plainDocument).length === 0) {
            return new HttpResponse("Bad Request", { status: 400 });
          } else {
            return HttpResponse.json({
              ...body.plainDocument,
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
            });
          }
        }
      ),
      http.post<PathParams, Record<string, any>>(
        "http://127.0.0.1/management/signature/validate",
        async ({ request }) => {
          const body = await request.json();
          if (Object.keys(body.proofDocument).length === 0) {
            return new HttpResponse("Bad Request", { status: 400 });
          } else {
            return HttpResponse.json(body.proofDocument);
          }
        }
      ),
      http.get(`http://127.0.0.1/management/did/resolve/did*`, () => {
        return HttpResponse.json(mockDidDocument());
      })
    );

    server.listen({
      onUnhandledRequest: "warn"
    });
  });

  afterAll(async () => {
    server.close();
  });

  const iamConfig = plainToInstance<TsgWalletConfig, TsgWalletConfig>(
    TsgWalletConfig,
    {
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
    }
  );
  const testAudience = "did:web:localhost%3A3000";
  const tsgWalletClient = new TsgWalletClient(
    iamConfig,
    new AuthClientService(plainToInstance(AuthConfig, { enabled: false }))
  );

  it("Request & Validate presentation", async () => {
    const vp =
      await tsgWalletClient.requestVerifiablePresentation(testAudience);
    expect(vp).toStrictEqual(expect.any(String));
    const valid = await tsgWalletClient.requestValidation(vp, testAudience);
    expect(valid).toBeDefined();
  });
  it("Get dataspace credentials", async () => {
    const credentials = await tsgWalletClient.getCredentials();
    expect(credentials).toHaveLength(1);
  });

  it("Signature service", async () => {
    await expect(tsgWalletClient.requestSignature({})).rejects.toThrow(
      "Could not sign document"
    );
    await tsgWalletClient.requestSignature({
      "@context": "http://schema.org/",
      "@type": "Person",
      name: "Jane Doe",
      jobTitle: "Professor",
      telephone: "(425) 123-4567",
      url: "http://www.janedoe.com"
    });
    await expect(
      tsgWalletClient.requestSignatureValidation({})
    ).rejects.toThrow("Could not validate document");
    await tsgWalletClient.requestSignatureValidation({
      "@context": "http://schema.org/",
      "@type": "Person",
      name: "Jane Doe",
      jobTitle: "Professor",
      telephone: "(425) 123-4567",
      url: "http://www.janedoe.com",
      proof: {
        type: "DataIntegrityProof",
        created: "2024-07-30T13:51:30.581Z",
        proofPurpose: "assertionMethod",
        verificationMethod: "did:web:dataspace-authority.example.com#key-0",
        cryptosuite: "eddsa-jcs-2022",
        proofValue:
          "z3f3bQLt79o87hpXSUzWYy1bVaLQLBeU9Aj6b7BHPmuL7vhmZu8wx2kvUQU3Y8PHNVKtahcQQQHyxcTfYq3tJquSe"
      }
    });
  });
});
