import { Test, TestingModule } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { createHash, generateKeyPairSync, randomBytes } from "crypto";
import { Request } from "express";
import { exportJWK, JWK, SignJWT } from "jose";
import { http, HttpResponse, PathParams } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { AuthConfig } from "../config/auth.js";
import { CodeTokenRequest, OpenIDConfiguration } from "./auth.dto.js";
import { OAuthService } from "./oauth.service.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

describe("OAuthService", () => {
  let oauth: OAuthService;
  let server: SetupServer;
  let publicKey: JWK;
  let privateKey: JWK;

  beforeAll(async () => {
    const kid = randomBytes(16).toString("hex");
    const keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKey = await exportJWK(keypair.privateKey);
    publicKey = await exportJWK(keypair.publicKey);
    privateKey.kid = kid;
    publicKey.kid = kid;

    const config: AuthConfig = plainToInstance(AuthConfig, {
      enabled: true,
      openIdConfigurationURL:
        "https://example.com/.well-known/openid-configuration",
      callbackURL: "http://localhost/callback",
      redirectURL: "http://localhost/",
      clientId: "client-id",
      clientSecret: "client-secret"
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        OpenIDConfigurationService,
        {
          provide: AuthConfig,
          useValue: config
        }
      ]
    }).compile();
    server = setupServer(
      http.get("https://example.com/.well-known/openid-configuration", () => {
        return HttpResponse.json<OpenIDConfiguration>({
          issuer: "https://example.com",
          authorization_endpoint: "https://example.com/authorize",
          token_endpoint: "https://example.com/token",
          userinfo_endpoint: "https://example.com/userinfo",
          introspection_endpoint: "https://example.com/introspect",
          device_authorization_endpoint:
            "https://example.com/device_authorization",
          revocation_endpoint: "https://example.com/revoke",
          jwks_uri: "https://example.com/.well-known/jwks.json",
          response_types_supported: ["code"],
          response_modes_supported: ["query"],
          id_token_signing_alg_values_supported: ["RS256"],
          scopes_supported: ["openid"],
          grant_types_supported: [
            "authorization_code",
            "refresh_token",
            "client_credentials"
          ],
          subject_types_supported: ["public"],
          claims_supported: [
            "aud",
            "exp",
            "iat",
            "iss",
            "sub",
            "username",
            "email",
            "roles"
          ]
        });
      }),
      http.get("https://example.com/.well-known/jwks.json", () => {
        return HttpResponse.json({
          keys: [publicKey]
        });
      }),
      http.get("https://example.com/authorize", () => {
        return HttpResponse.json({});
      }),
      http.post<PathParams, CodeTokenRequest>(
        "https://example.com/token",
        async ({ request }) => {
          const token = await new SignJWT({
            roles: ["user"],
            tokenType: "access_token",
            username: "test-user",
            email: "alice@example.com"
          })
            .setProtectedHeader({
              alg: "RS256",
              typ: "JWT",
              kid: privateKey.kid
            })
            .setAudience("client-id")
            .setSubject("1")
            .setIssuer("https://example.com")
            .setIssuedAt(Math.floor(Date.now() / 1000))
            .setNotBefore(Math.floor(Date.now() / 1000))
            .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
            .setJti(randomBytes(16).toString("hex"))
            .sign(privateKey);
          const requestBody = await request.json();
          if (requestBody.code === "test-code") {
            return HttpResponse.json({
              access_token: token,
              id_token: token,
              token_type: "Bearer",
              expires_in: 3600
            });
          } else if (requestBody.code === "code-access-token") {
            return HttpResponse.json({
              access_token: token,
              token_type: "Bearer",
              expires_in: 3600
            });
          } else if (requestBody.code === "code-error") {
            return HttpResponse.json({});
          }
        }
      ),
      http.post<PathParams, { token: string }>(
        "https://example.com/introspect",
        async ({ request }) => {
          const requestBody = await request.json();
          if (requestBody.token === "test-token") {
            return HttpResponse.json({
              active: true,
              username: "test-user",
              sub: "1"
            });
          } else {
            return HttpResponse.json({
              active: false
            });
          }
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });
    oauth = module.get<OAuthService>(OAuthService);
  });

  afterAll(() => {
    server.close();
  });

  describe("Authorization flow", () => {
    let state: string;
    let codeVerifier: string;
    it("Test authorization request", async () => {
      const response = await oauth.generateAuthorizationRequestUrl();
      const responseURL = new URL(response);
      expect(responseURL.searchParams.get("response_type")).toEqual("code");
      expect(responseURL.searchParams.get("response_mode")).toEqual("query");
      expect(responseURL.searchParams.get("client_id")).toEqual("client-id");
      expect(responseURL.searchParams.get("redirect_uri")).toEqual(
        "http://localhost/callback"
      );
      expect(responseURL.searchParams.get("code_challenge_method")).toEqual(
        "S256"
      );
      state = responseURL.searchParams.get("state")!;
      expect(state).toBeDefined();
      // PKCE fix: codeVerifier is generated and code_challenge is derived from it
      codeVerifier = oauth["redirects"].get(state)?.code_verifier || "";
      expect(codeVerifier).toBeDefined();
      const codeChallenge = responseURL.searchParams.get("code_challenge")!;
      expect(codeChallenge).toBe(
        createHash("sha256").update(codeVerifier).digest("base64url")
      );
    });
    it("Test callback", async () => {
      const request = {
        session: {}
      } as Request;
      const callback = await oauth.callback(
        {
          state,
          code: "test-code",
          code_verifier: createHash("sha256")
            .update(codeVerifier)
            .digest("base64url")
        },
        request
      );
      expect(callback).toBeDefined();
      expect(callback.url).toBeDefined();
      expect(callback.url).toBe("http://localhost/");
      oauth["redirects"].set(state, {
        code_verifier: codeVerifier,
        validUntil: Date.now() + 1000
      });
      const callback2 = await oauth.callback(
        {
          state,
          code: "code-access-token",
          code_verifier: createHash("sha256")
            .update(codeVerifier)
            .digest("base64url")
        },
        request
      );
      expect(callback2).toBeDefined();
      expect(callback2.url).toBeDefined();
      expect(callback2.url).toBe("http://localhost/");
    });
    it("Test callback errors", async () => {
      const request = {
        session: {}
      } as Request;
      await expect(oauth.callback({}, request)).rejects.toThrow(
        "No state parameter"
      );
      await expect(
        oauth.callback({ state: "unknown" }, request)
      ).rejects.toThrow("Invalid state parameter");
      oauth["redirects"].set("expired", {
        code_verifier: codeVerifier,
        validUntil: Date.now() - 1000
      });
      await expect(
        oauth.callback({ state: "expired" }, request)
      ).rejects.toThrow("State parameter expired");
      oauth["redirects"].set("valid", {
        code_verifier: "codeVerifier",
        validUntil: Date.now() + 1000
      });

      oauth["redirects"].set(state, {
        code_verifier: codeVerifier,
        validUntil: Date.now() + 1000
      });
      await expect(
        oauth.callback(
          {
            state,
            code: "code-error",
            code_verifier: createHash("sha256")
              .update(codeVerifier)
              .digest("base64url")
          },
          request
        )
      ).rejects.toThrow("No access token or id token");
    });
  });
  it("Token validation", async () => {
    const token = await new SignJWT({
      roles: ["user"],
      tokenType: "access_token",
      username: "test-user",
      email: "alice@example.com"
    })
      .setProtectedHeader({
        alg: "RS256",
        typ: "JWT",
        kid: privateKey.kid
      })
      .setAudience("client-id")
      .setSubject("1")
      .setIssuer("https://example.com")
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setNotBefore(Math.floor(Date.now() / 1000))
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .setJti(randomBytes(16).toString("hex"))
      .sign(privateKey);
    const jwksValidation = await oauth.validateToken(token);
    expect(jwksValidation).toBeDefined();
    expect(jwksValidation.username).toBe("test-user");

    const introspectionValidation = await oauth.validateToken("test-token");
    expect(introspectionValidation).toBeDefined();
    expect(introspectionValidation.username).toBe("test-user");

    await expect(oauth.validateToken("unknown-token")).rejects.toThrow(
      "Access token not active"
    );
  });
});
