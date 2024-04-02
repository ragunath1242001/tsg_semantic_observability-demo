import { plainToInstance } from "class-transformer";
import { TsgWalletDirectConfig } from "../../config";
import { TsgWalletClient } from "./tsg.wallet";
import { HttpResponse, PathParams, http } from "msw";
import { SetupServer, setupServer } from "msw/node";
import { VerifiablePresentationJwt } from "@tsg-dsp/common";

describe("TSG Wallet", () => {
  let server: SetupServer;
  beforeAll(async () => {
    server = setupServer(
      http.post("http://127.0.0.1/tsg/token", () => {
        return HttpResponse.json({
          access_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTM0MjQ2ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb25uZWN0b3IiLCJlbWFpbCI6Im5vcmVwbHlAZGF0YXNwYWMuZXMiLCJkaWRJZCI6ImRpZDp3ZWI6d2FsbGV0LWNhdGVuYS14LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJyb2xlcyI6WyJ2aWV3X3ByZXNlbnRhdGlvbnMiXSwiaWF0IjoxNjkzNDIzNzgyLCJleHAiOjE2OTQwMjg1ODJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
        });
      }),
      http.get("http://127.0.0.1/tsg/presentations", () => {
        return HttpResponse.json({
          vp: "eyJhbGciOiJFZERTQSJ9.eyJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdzNjLmdpdGh1Yi5pby92Yy1qd3MtMjAyMC9jb250ZXh0cy92MS8iXSwiQHR5cGUiOlsiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiJdLCJ2ZXJpZmlhYmxlQ3JlZGVudGlhbCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdzNjLmdpdGh1Yi5pby92Yy1qd3MtMjAyMC9jb250ZXh0cy92MS8iLCJodHRwczovL3dhbGxldC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzL2NvbnRleHQvU0NTTiJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiU0NTTkNyZWRlbnRpYWwiXSwiaWQiOiJkaWQ6d2ViOndhbGxldC1jYXRlbmEteC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzIzkwMjc3NDgxLTg5ZmMtNDdjMS05ZmNiLTdhYmJiZTVhYWM2ZSIsImlzc3VlciI6ImRpZDp3ZWI6d2FsbGV0LmFscGhhLnNjc24uZGF0YXNwYWMuZXMiLCJpc3N1YW5jZURhdGUiOiIyMDIzLTA4LTMwVDE1OjA4OjM5LjM0MFoiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjMtMTEtMzBUMTU6MDg6MzkuMzQwWiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoiZGlkOndlYjp3YWxsZXQtY2F0ZW5hLXguYWxwaGEuc2Nzbi5kYXRhc3BhYy5lcyIsInNjc25JZGVudGlmaWVyIjoidXJuOnNjc246MjM0NTY3ODkwMTIzNDUiLCJzY3NuUm9sZSI6InNjc246U2VydmljZVByb3ZpZGVyIn0sInByb29mIjp7InR5cGUiOiJKc29uV2ViU2lnbmF0dXJlMjAyMCIsImNyZWF0ZWQiOiIyMDIzLTA4LTMwVDE1OjA4OjM5Ljg4N1oiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJqd3MiOiJleUpoYkdjaU9pSkZaRVJUUVNJc0ltSTJOQ0k2Wm1Gc2MyVXNJbU55YVhRaU9sc2lZalkwSWwxOS4uY2QyZUtRMGVDUUpDa3FMVm1FSFpfcHFXX21tNXdrT0l6YU0xYkI0RnBoSUtTYUlFSmhFVTRmSEtIR21zZFZGSHBUZG1ndlE0ZTUyWW9mQTAwdWp2QWciLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6d2ViOndhbGxldC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzI2tleS0wIn19fSwiaWF0IjoxNjkzNDI0NTY3LCJpc3MiOiJkaWQ6d2ViOndhbGxldC1jYXRlbmEteC5hbHBoYS5zY3NuLmRhdGFzcGFjLmVzIiwic3ViIjoiZGlkOndlYjp3YWxsZXQuYWxwaGEuc2Nzbi5kYXRhc3BhYy5lcyIsImF1ZCI6ImRpZDp3ZWI6QVVESUVOQ0UiLCJleHAiOjE2OTM1MTA5NjcsImp0aSI6IjVhMDYwMDRlLTJkMzktNGNjZC1hMGM0LWNmOGQzNmEyODdiZSJ9.UkVNT1ZFRF9TSUdOQVRVUkU",
        });
      }),
      http.post<PathParams, VerifiablePresentationJwt>(
        "http://127.0.0.1/tsg/validate",
        async ({ request }) => {
          return HttpResponse.json({
            valid: true,
            validateExpiryDate: [true],
            validateCredentials: [true],
            validateTrustAnchors: [true],
            validateJWTSignature: true,
            validateJWTExpiryDate: true,
            vp: (await request.json()).vp,
          });
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

  const iamConfig = plainToInstance<
    TsgWalletDirectConfig,
    TsgWalletDirectConfig
  >(TsgWalletDirectConfig, {
    type: "tsg",
    didId: "did:web:wallet-catena-x.alpha.scsn.dataspac.es",
    walletUrl: "http://127.0.0.1/api",
    tokenUrl: "http://127.0.0.1/tsg/token",
    presentationUrl: "http://127.0.0.1/tsg/presentations",
    validationUrl: "http://127.0.0.1/tsg/validate",
    clientId: "testClient",
    clientSecret: "testSecret",
    credentialId:
      "did:web:wallet-catena-x.alpha.scsn.dataspac.es#90277481-89fc-47c1-9fcb-7abbbe5aac6e",
    validations: ["valid"],
  });
  const testAudience = "did:web:test-audience.com";
  const tsgWalletClient = new TsgWalletClient(iamConfig);

  it("Request & Validate presentation", async () => {
    const vp = await tsgWalletClient.requestVerifiablePresentation(
      testAudience
    );
    expect(vp).toStrictEqual(expect.any(String));
    const valid = await tsgWalletClient.requestValidation(vp, testAudience);
    expect(valid).toBeDefined();
  });
});
