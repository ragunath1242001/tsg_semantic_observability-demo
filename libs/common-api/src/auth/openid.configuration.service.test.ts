import { AuthConfig } from "../config/auth.js";
import { Test, TestingModule } from "@nestjs/testing";
import { setupServer, SetupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { plainToInstance } from "class-transformer";
import { OpenIDConfiguration } from "./auth.dto.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";
import { randomBytes, generateKeyPairSync } from "crypto";
import { exportJWK, JWK } from "jose";

describe("OAuthService", () => {
  let openIDConfigurationService: OpenIDConfigurationService;
  let server: SetupServer;
  let publicKeys: JWK[];
  let privateKeys: JWK[];

  beforeAll(async () => {
    const kid = randomBytes(16).toString("hex");
    const keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKeys = [
      {
        ...(await exportJWK(keypair.privateKey)),
        kid
      }
    ];
    publicKeys = [
      {
        ...(await exportJWK(keypair.publicKey)),
        kid
      }
    ];

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
        OpenIDConfigurationService,
        {
          provide: AuthConfig,
          useValue: config
        }
      ]
    }).compile();
    server = setupServer(
      http.get(
        "https://example.com/.well-known/openid-configuration",
        ({ request, params, cookies }) => {
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
        }
      ),
      http.get(
        "https://example.com/.well-known/jwks.json",
        ({ request, params, cookies }) => {
          return HttpResponse.json({
            keys: publicKeys
          });
        }
      ),
      http.get(
        "https://example.com/authorize",
        ({ request, params, cookies }) => {
          return HttpResponse.json({});
        }
      ),
      http.post("https://example.com/token", ({ request, params, cookies }) => {
        return HttpResponse.json({});
      }),
      http.post(
        "https://example.com/introspect",
        ({ request, params, cookies }) => {
          return HttpResponse.json({});
        }
      ),
      http.get(
        "https://example.com/unknown",
        ({ request, params, cookies }) => {
          return HttpResponse.text("", { status: 404 });
        }
      )
    );

    server.listen({ onUnhandledRequest: "error" });
    openIDConfigurationService = module.get<OpenIDConfigurationService>(
      OpenIDConfigurationService
    );
  });

  afterAll(() => {
    server.close();
  });

  it("Test metadata", async () => {
    expect(openIDConfigurationService).toBeDefined();
    const openIdConfiguration =
      await openIDConfigurationService.getOpenIdConfiguration();
    expect(openIdConfiguration).toBeDefined();
    expect(openIdConfiguration.jwks_uri).toEqual(
      "https://example.com/.well-known/jwks.json"
    );
    const jwks = await openIDConfigurationService.getJwks();
    expect(jwks).toBeDefined();
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length).toEqual(1);
    expect(jwks.keys[0]).toEqual(publicKeys[0]);
  });
  it("Test getKey", async () => {
    const key = await openIDConfigurationService.getKey(publicKeys[0].kid);
    expect(key).toEqual(publicKeys[0]);

    await expect(openIDConfigurationService.getKey()).rejects.toThrow(
      "No key ID present in JWT"
    );

    await expect(openIDConfigurationService.getKey("invalid")).rejects.toThrow(
      "Could not find matching key"
    );

    const kid = randomBytes(16).toString("hex");
    const keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKeys.push({
      ...(await exportJWK(keypair.privateKey)),
      kid
    });
    publicKeys.push({
      ...(await exportJWK(keypair.publicKey)),
      kid
    });
    const key2 = await openIDConfigurationService.getKey(kid);
    expect(key2).toEqual(publicKeys[1]);
  });

  it("Test configuration errors", async () => {
    const service = new OpenIDConfigurationService({
      openIdConfigurationURL: "https://example.com/unknown"
    } as AuthConfig);
    await expect(service.getOpenIdConfiguration()).rejects.toThrow(
      "getting OpenID configuration metadata"
    );
    service["openIdConfiguration"] = {
      jwks_uri: "https://example.com/unknown"
    } as OpenIDConfiguration;
    await expect(service.getJwks()).rejects.toThrow("getting JWKS");
  });
});
