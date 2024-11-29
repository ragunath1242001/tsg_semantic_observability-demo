import { VerifiablePresentationJwt } from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { MiwConfig } from "../../config";
import { ManagedIdentityWalletClient } from "./miw.wallet";

describe("Managed Identity Wallet", () => {
  let server: SetupServer;
  beforeAll(async () => {
    server = setupServer(
      http.post("http://127.0.0.1/miw/token", () => {
        return HttpResponse.json({
          access_token:
            "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJIVUgzYjZrMzZvbFNQVTRDRTRaMVUxUjhVeHg4eFQwS3p4QXdLb3NkVk1VIn0.eyJleHAiOjE2OTM0OTg4MjksImlhdCI6MTY5MzQ5ODUyOSwianRpIjoiZDhkMDQyNWEtYWM5YS00NDVlLTg0MzktMGY3OTRmMTNlZTg1IiwiaXNzIjoiaHR0cHM6Ly9jZW50cmFsaWRwLmludC5kZW1vLmNhdGVuYS14Lm5ldC9hdXRoL3JlYWxtcy9DWC1DZW50cmFsIiwiYXVkIjpbInJlYWxtLW1hbmFnZW1lbnQiLCJ0ZWNobmljYWxfcm9sZXNfbWFuYWdlbWVudCIsIkNsNS1DWC1DdXN0b2RpYW4iLCJhY2NvdW50Il0sInN1YiI6ImUyOTc5MDBhLWEyMGEtNDYwNi04OWQxLWU1NGI4MWQ2YmQ3MSIsInR5cCI6IkJlYXJlciIsImF6cCI6InNhNDM3IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL251bGwiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwiZGVmYXVsdC1yb2xlcy1jYXRlbmEteCByZWFsbSIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsicmVhbG0tbWFuYWdlbWVudCI6eyJyb2xlcyI6WyJtYW5hZ2UtdXNlcnMiLCJ2aWV3LWNsaWVudHMiLCJxdWVyeS1jbGllbnRzIl19LCJ0ZWNobmljYWxfcm9sZXNfbWFuYWdlbWVudCI6eyJyb2xlcyI6WyJJZGVudGl0eSBXYWxsZXQgTWFuYWdlbWVudCJdfSwiQ2w1LUNYLUN1c3RvZGlhbiI6eyJyb2xlcyI6WyJ1cGRhdGVfd2FsbGV0Iiwidmlld193YWxsZXQiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSBlbWFpbCIsImJwbiI6IkJQTkwwMDAwMDAwM0FZUkUiLCJjbGllbnRIb3N0IjoiMTAuMjQwLjAuNiIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiY2xpZW50SWQiOiJzYTQzNyIsInByZWZlcnJlZF91c2VybmFtZSI6InNlcnZpY2UtYWNjb3VudC1zYTQzNyIsImNsaWVudEFkZHJlc3MiOiIxMC4yNDAuMC42In0.UkVNT1ZFRF9TSUdOQVRVUkU",
          expires_in: 300,
          refresh_expires_in: 0,
          token_type: "Bearer",
          "not-before-policy": 1660280763,
          scope: "profile email"
        });
      }),
      http.get("http://127.0.0.1/miw/wallet", () => {
        return HttpResponse.json({
          name: "managedWallet_BPNL00000003AYRE",
          did: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003AYRE",
          bpn: "BPNL00000003AYRE",
          algorithm: "ED25519",
          didDocument: {
            id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003AYRE",
            verificationMethod: [],
            "@context": "https://www.w3.org/ns/did/v1"
          },
          verifiableCredentials: [
            {
              credentialSubject: [
                {
                  bpn: "BPNL00000003AYRE",
                  id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003AYRE",
                  type: "BpnCredential"
                }
              ],
              issuanceDate: "2023-07-10T00:33:44Z",
              id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#a40ca725-3ad1-4742-a441-a2e1092a5d0b",
              proof: {
                created: "2023-07-10T00:33:44Z",
                jws: "eyJhbGciOiJFZERTQSJ9..UkVNT1ZFRF9TSUdOQVRVUkU",
                proofPurpose: "proofPurpose",
                type: "JsonWebSignature2020",
                verificationMethod:
                  "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#"
              },
              type: ["VerifiableCredential", "BpnCredential"],
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://catenax-ng.github.io/product-core-schemas/businessPartnerData.json",
                "https://w3id.org/security/suites/jws-2020/v1"
              ],
              issuer:
                "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK",
              expirationDate: "2023-10-01T00:00:00Z"
            },
            {
              credentialSubject: [
                {
                  holderIdentifier: "BPNL00000003AYRE",
                  id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003AYRE",
                  memberOf: "Catena-X",
                  startTime: "2023-07-10T00:33:45.393261800Z",
                  status: "Active",
                  type: "MembershipCredential"
                }
              ],
              issuanceDate: "2023-07-10T00:33:45Z",
              id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#15186cc4-531b-49ac-a29e-697706a9bc45",
              proof: {
                created: "2023-07-10T00:33:45Z",
                jws: "eyJhbGciOiJFZERTQSJ9..UkVNT1ZFRF9TSUdOQVRVUkU",
                proofPurpose: "proofPurpose",
                type: "JsonWebSignature2020",
                verificationMethod:
                  "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#"
              },
              type: ["VerifiableCredential", "MembershipCredential"],
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://catenax-ng.github.io/product-core-schemas/businessPartnerData.json",
                "https://w3id.org/security/suites/jws-2020/v1"
              ],
              issuer:
                "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK",
              expirationDate: "2023-10-01T00:00:00Z"
            },
            {
              credentialSubject: [
                {
                  contractTemplate: "https://public.catena-x.org/contracts/",
                  holderIdentifier: "BPNL00000003AYRE",
                  id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003AYRE",
                  items: ["BpnCredential", "MembershipCredential"],
                  type: "SummaryCredential"
                }
              ],
              issuanceDate: "2023-07-10T00:33:45Z",
              id: "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#c67bc7be-2096-4f91-9a07-a932876b677c",
              proof: {
                created: "2023-07-10T00:33:46Z",
                jws: "eyJhbGciOiJFZERTQSJ9..UkVNT1ZFRF9TSUdOQVRVUkU",
                proofPurpose: "proofPurpose",
                type: "JsonWebSignature2020",
                verificationMethod:
                  "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#"
              },
              type: ["VerifiableCredential", "SummaryCredential"],
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://catenax-ng.github.io/product-core-schemas/SummaryVC.json",
                "https://w3id.org/security/suites/jws-2020/v1"
              ],
              issuer:
                "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK",
              expirationDate: "2023-10-01T00:00:00Z"
            }
          ]
        });
      }),
      http.post("http://127.0.0.1/miw/presentations", () => {
        return HttpResponse.json({
          vp: "eyJraWQiOiJkaWQ6d2ViOm1hbmFnZWQtaWRlbnRpdHktd2FsbGV0cy1uZXcuaW50LmRlbW8uY2F0ZW5hLXgubmV0OkJQTkwwMDAwMDAwM0FZUkUiLCJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9.eyJzdWIiOiJkaWQ6d2ViOm1hbmFnZWQtaWRlbnRpdHktd2FsbGV0cy1uZXcuaW50LmRlbW8uY2F0ZW5hLXgubmV0OkJQTkwwMDAwMDAwM0FZUkUiLCJhdWQiOiJkaWQ6d2ViOndhbGxldC1zcGEuYWxwaGEuc2Nzbi5kYXRhc3BhYy5lcyIsImlzcyI6ImRpZDp3ZWI6bWFuYWdlZC1pZGVudGl0eS13YWxsZXRzLW5ldy5pbnQuZGVtby5jYXRlbmEteC5uZXQ6QlBOTDAwMDAwMDAzQVlSRSIsInZwIjp7ImlkIjoiZGlkOndlYjptYW5hZ2VkLWlkZW50aXR5LXdhbGxldHMtbmV3LmludC5kZW1vLmNhdGVuYS14Lm5ldDpCUE5MMDAwMDAwMDNBWVJFI2NkMDk0NGI0LTkwNDYtNDdkMC1hYjM3LWE4NjBjZTc1ZWFjOCIsInR5cGUiOlsiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiJdLCJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ2ZXJpZmlhYmxlQ3JlZGVudGlhbCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vY2F0ZW5heC1uZy5naXRodWIuaW8vcHJvZHVjdC1jb3JlLXNjaGVtYXMvU3VtbWFyeVZDLmpzb24iLCJodHRwczovL3czaWQub3JnL3NlY3VyaXR5L3N1aXRlcy9qd3MtMjAyMC92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiU3VtbWFyeUNyZWRlbnRpYWwiXSwiaWQiOiJkaWQ6d2ViOm1hbmFnZWQtaWRlbnRpdHktd2FsbGV0cy1uZXcuaW50LmRlbW8uY2F0ZW5hLXgubmV0OkJQTkwwMDAwMDAwM0NSSEsjYzY3YmM3YmUtMjA5Ni00ZjkxLTlhMDctYTkzMjg3NmI2NzdjIiwiaXNzdWVyIjoiZGlkOndlYjptYW5hZ2VkLWlkZW50aXR5LXdhbGxldHMtbmV3LmludC5kZW1vLmNhdGVuYS14Lm5ldDpCUE5MMDAwMDAwMDNDUkhLIiwiaXNzdWFuY2VEYXRlIjoiMjAyMy0wNy0xMFQwMDozMzo0NVoiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjMtMTAtMDFUMDA6MDA6MDBaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6d2ViOm1hbmFnZWQtaWRlbnRpdHktd2FsbGV0cy1uZXcuaW50LmRlbW8uY2F0ZW5hLXgubmV0OkJQTkwwMDAwMDAwM0FZUkUiLCJob2xkZXJJZGVudGlmaWVyIjoiQlBOTDAwMDAwMDAzQVlSRSIsInR5cGUiOiJTdW1tYXJ5Q3JlZGVudGlhbCIsImNvbnRyYWN0VGVtcGxhdGUiOiJodHRwczovL3B1YmxpYy5jYXRlbmEteC5vcmcvY29udHJhY3RzLyIsIml0ZW1zIjpbIkJwbkNyZWRlbnRpYWwiLCJNZW1iZXJzaGlwQ3JlZGVudGlhbCJdfSwicHJvb2YiOnsicHJvb2ZQdXJwb3NlIjoicHJvb2ZQdXJwb3NlIiwidHlwZSI6Ikpzb25XZWJTaWduYXR1cmUyMDIwIiwidmVyaWZpY2F0aW9uTWV0aG9kIjoiZGlkOndlYjptYW5hZ2VkLWlkZW50aXR5LXdhbGxldHMtbmV3LmludC5kZW1vLmNhdGVuYS14Lm5ldDpCUE5MMDAwMDAwMDNDUkhLIyIsImNyZWF0ZWQiOiIyMDIzLTA3LTEwVDAwOjMzOjQ2WiIsImp3cyI6ImV5SmhiR2NpT2lKRlpFUlRRU0o5Li5KQ0RYMmtReXNrSVlHR191eVRVYzhFWVZ4RDliV3I0R1JCWEp2dy1Yak1qb2VKT0FGUDFhX0d1cFZPcVVJNTJhLWVZRVJkcExlcE9lV2hHRkhsUWxBQSJ9fX0sImV4cCI6MTY5MzQ2NzA2MCwianRpIjoiYTViMTNhNDMtZmZkZS00NDBhLTg3YzAtZjZiODFjNjQzNWY0In0.UkVNT1ZFRF9TSUdOQVRVUkU"
        });
      }),
      http.post<PathParams, VerifiablePresentationJwt>(
        "http://127.0.0.1/miw/validate",
        async ({ request }) => {
          return HttpResponse.json({
            valid: true,
            validateAudience: true,
            validateExpiryDate: true,
            vp: (await request.json()).vp
          });
        }
      )
    );

    server.listen({
      onUnhandledRequest: "warn"
    });
  });

  afterAll(async () => {
    server.close();
  });

  const iamConfig = plainToInstance<MiwConfig, MiwConfig>(MiwConfig, {
    type: "miw",
    didId:
      "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK",
    tokenUrl: "http://127.0.0.1/miw/token",
    walletUrl: "http://127.0.0.1/miw/wallet",
    presentationUrl: "http://127.0.0.1/miw/presentations",
    validationUrl: "http://127.0.0.1/miw/validate",
    clientId: "testClient",
    clientSecret: "testSecret",
    credentialId:
      "did:web:managed-identity-wallets-new.int.demo.catena-x.net:BPNL00000003CRHK#c67bc7be-2096-4f91-9a07-a932876b677c",
    validations: ["valid"]
  });
  const testAudience = "did:web:test-audience.com";
  const miwWalletClient = new ManagedIdentityWalletClient(iamConfig);

  it("Request & Validate presentation", async () => {
    const vp =
      await miwWalletClient.requestVerifiablePresentation(testAudience);
    expect(vp).toStrictEqual(expect.any(String));

    const valid = await miwWalletClient.requestValidation(vp, testAudience);
    expect(valid).toBeDefined();
  });

  it("Test unimplemented methods", async () => {
    const credentials = await miwWalletClient.getCredentials();
    expect(credentials).toHaveLength(0);

    await expect(miwWalletClient.requestSignature({})).rejects.toThrow(
      "MIW does not support signing of documents"
    );
    await expect(
      miwWalletClient.requestSignatureValidation({})
    ).rejects.toThrow("MIW does not support validation of documents");
    await expect(miwWalletClient.resolveDidDocument("")).rejects.toThrow(
      "MIW does not support resolving DID Documents"
    );
  });
});
