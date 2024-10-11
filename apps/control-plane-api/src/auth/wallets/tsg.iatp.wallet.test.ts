import { plainToInstance } from "class-transformer";
import { AuthConfig, TsgWalletIatpConfig } from "../../config";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { TsgIatpWalletClient } from "./tsg.iatp.wallet";
import { AuthClientService } from "../auth.client.service";
import { mockDidDocument } from "./wallet.util.test";

describe("TSG Wallet", () => {
  let server: SetupServer;
  beforeAll(async () => {
    server = setupServer(
      http.post("http://127.0.0.1/api/auth/login", () => {
        return HttpResponse.json({
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTQwMjg1ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
        });
      }),
      http.get("http://127.0.0.1/api/iatp/holder/token", () => {
        return HttpResponse.json({
          id_token:
            "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp3ZWI6bG9jYWxob3N0JTNBMzAwMCNrZXktMCJ9.eyJhdWQiOiJkaWQ6d2ViOmxvY2FsaG9zdCUzQTMwMDAiLCJ0b2tlbiI6IjliYjU0YjliMmM3YWI0NjBjZTc2MGRjOTQ4OWUxNTBmZDU5NzE3NWY1OTJmYWM0N2YyZmMyMzg4ZTJmYzVkYjEyYWE4MzRhYTAxOGJjZDcyNTRmYTRhNWIzZjBiMjk1YyIsImlhdCI6MTcxMTcxNzgzMSwiaXNzIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzMDAwIiwic3ViIjoiZGlkOndlYjpsb2NhbGhvc3QlM0EzMDAwIiwianRpIjoiMDI2MDI4YTctZGE1Mi00M2Q2LTlhYzYtYWNhMTE3ZWRhYWFhIiwiZXhwIjoxNzExNzE4MTMxfQ.Aif9GVz9fwmQxrJP58PUH6FXAUZxwCWy_JFSy8-Pk7Ud2qksKqM3v42oKfQywO108MkwaQ95N_hlj-n562PPDw",
        });
      }),
      http.post("http://127.0.0.1/api/iatp/verifier/verify", () => {
        return HttpResponse.json({
          "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://w3c.github.io/vc-jws-2020/contexts/v1/",
          ],
          type: ["VerifiablePresentation"],
          id: "did:web:localhost%3A3000#c4c5c4c6-e1c8-44d9-8745-a1ce8f55c13d",
          verifiableCredential: [
            {
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3c.github.io/vc-jws-2020/contexts/v1/",
              ],
              type: ["VerifiableCredential"],
              id: "did:web:localhost%3A3000#test",
              issuer: "did:web:localhost%3A3000",
              issuanceDate: "2024-03-29T08:17:00.122Z",
              expirationDate: "2024-06-29T08:17:00.122Z",
              credentialSubject: {
                id: "did:web:localhost%3A3000",
              },
              proof: {
                type: "JsonWebSignature2020",
                created: "2024-03-29T08:17:00.685Z",
                proofPurpose: "assertionMethod",
                jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..nirMrWvJsxFkl8KlhDLBcyTjg8aOGI1UA8wFA2iYuoFEtpf1Z1Ok3T8bwOjDJeCoYZU-lIG-9oIaGKyFIzdGAg",
                verificationMethod: "did:web:localhost%3A3000#key-0",
              },
            },
          ],
        });
      }),
      http.get("http://127.0.0.1/api/management/credentials/dataspace", () => {
        return HttpResponse.json([{}]);
      }),
      http.post<PathParams, Record<string, any>>(
        "http://127.0.0.1/api/management/signature/sign",
        async ({ request }) => {
          const body = await request.json();
          if (Object.keys(body.plainDocument).length === 0) {
            return new HttpResponse("Bad Request", { status: 400 });
          } else {
            return HttpResponse.json({
              ...body.plainDocument,
              proof: {
                type: "JsonWebSignature2020",
                created: "2024-07-29T16:10:20.763Z",
                proofPurpose: "assertionMethod",
                jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8zL0OkKo0z1VkxF2ZVtTmHP8e5GdxdwPyCc4RrD-d155B2NhB8jsUfMiw4H0en6dnnbV6AucUTw0MfHKJJfxBA",
                verificationMethod: "did:web:localhost%3A3000#key-0",
              },
            });
          }
        }
      ),
      http.post<PathParams, Record<string, any>>(
        "http://127.0.0.1/api/management/signature/validate",
        async ({ request }) => {
          const body = await request.json();
          if (Object.keys(body.jsonWebSignature).length === 0) {
            return new HttpResponse("Bad Request", { status: 400 });
          } else {
            return HttpResponse.json(body.jsonWebSignature);
          }
        }
      ),
      http.get(
        `http://127.0.0.1/api/management/did/resolve/${encodeURI(
          "did:web:localhost"
        )}`,
        () => {
          return HttpResponse.json(mockDidDocument());
        }
      )
    );

    server.listen({
      onUnhandledRequest: "bypass",
    });
  });

  afterAll(async () => {
    server.close();
  });

  const iamConfig = plainToInstance<TsgWalletIatpConfig, TsgWalletIatpConfig>(
    TsgWalletIatpConfig,
    {
      type: "tsg-iatp",
      didId: "did:web:localhost%3A3000",
      walletUrl: "http://127.0.0.1/api",
      siopUrl: "http://127.0.0.1/api/iatp/holder/token",
      verifyUrl: "http://127.0.0.1/api/iatp/verifier/verify",
      tokenUrl: "http://127.0.0.1/api/auth/login",
      clientId: "admin",
      clientSecret: "test",
      typeFilter: "VerifiableCredential",
      issuerFilter: "did:web:localhost%3A3000",
    }
  );
  const testAudience = "did:web:localhost%3A3000";
  const tsgWalletClient = new TsgIatpWalletClient(
    iamConfig,
    new AuthClientService(plainToInstance(AuthConfig, { enabled: false }))
  );

  it("Request & Validate presentation", async () => {
    const vp = await tsgWalletClient.requestVerifiablePresentation(
      testAudience
    );
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
      url: "http://www.janedoe.com",
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
        type: "JsonWebSignature2020",
        created: "2024-07-29T16:10:20.763Z",
        proofPurpose: "assertionMethod",
        jws: "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..8zL0OkKo0z1VkxF2ZVtTmHP8e5GdxdwPyCc4RrD-d155B2NhB8jsUfMiw4H0en6dnnbV6AucUTw0MfHKJJfxBA",
        verificationMethod: "did:web:localhost%3A3000#key-0",
      },
    });
  });

  it("Resolve DID Document", async () => {
    await expect(tsgWalletClient.resolveDidDocument("")).rejects.toThrow(
      "Could not resolve DID Document"
    );

    const expectedDidDoc = mockDidDocument();
    const resolvedDidDoc = await tsgWalletClient.resolveDidDocument(
      encodeURI("did:web:localhost")
    );
    expect(resolvedDidDoc).toBeDefined();
    expect(resolvedDidDoc.id).toEqual(expectedDidDoc.id);
    expect(resolvedDidDoc.verificationMethod).toEqual(
      expectedDidDoc.verificationMethod
    );
    expect(resolvedDidDoc.service).toEqual(expectedDidDoc.service);
    expect(resolvedDidDoc.assertionMethod).toEqual(
      expectedDidDoc.assertionMethod
    );
  });
});
