import { Test, TestingModule } from "@nestjs/testing";
import { plainToInstance } from "class-transformer";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { AuthConfig } from "../config/auth.js";
import { RequestContext } from "../utils/logging.js";
import { DELEGATION_HEADERS } from "./abac/delegation.constants.js";
import { AuthClientService } from "./auth.client.service.js";
import { OpenIDConfiguration } from "./auth.dto.js";
import { OpenIDConfigurationService } from "./openid.configuration.service.js";

describe("OAuthService", () => {
  let authClientService: AuthClientService;
  let server: SetupServer;
  let tokenResponse: "correct" | "missing" | "erronous" = "correct";

  beforeAll(async () => {
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
        AuthClientService,
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
      http.post("https://example.com/token", () => {
        switch (tokenResponse) {
          case "missing":
            return HttpResponse.json({});
          case "erronous":
            return HttpResponse.json({}, { status: 400 });
          case "correct":
            return HttpResponse.json({
              access_token: `.${Buffer.from(
                JSON.stringify({
                  exp: Math.floor(Date.now() / 1000) + 3600
                })
              ).toString("base64url")}.`
            });
        }
      }),
      http.post("https://example.com/returnToken", ({ request }) => {
        return HttpResponse.json({
          token: request.headers.get("Authorization"),
          originalActor: request.headers.get(DELEGATION_HEADERS.ORIGINAL_ACTOR),
          delegationChain: request.headers.get(
            DELEGATION_HEADERS.DELEGATION_CHAIN
          ),
          effectivePermissions: request.headers.get(
            DELEGATION_HEADERS.EFFECTIVE_PERMISSIONS
          ),
          correlationId: request.headers.get(DELEGATION_HEADERS.CORRELATION_ID),
          originTimestamp: request.headers.get(
            DELEGATION_HEADERS.ORIGIN_TIMESTAMP
          )
        });
      })
    );

    server.listen({ onUnhandledRequest: "error" });
    authClientService = module.get<AuthClientService>(AuthClientService);
  });

  afterAll(() => {
    server.close();
  });

  it("Test getToken", async () => {
    tokenResponse = "missing";
    const missingAccessToken = await authClientService.getToken();
    expect(missingAccessToken).toBeUndefined();
    tokenResponse = "erronous";
    const erronousToken = await authClientService.getToken();
    expect(erronousToken).toBeUndefined();
    tokenResponse = "correct";
    const token = await authClientService.getToken();
    expect(token).toBeDefined();
    const cachedToken = await authClientService.getToken();
    expect(cachedToken).toBeDefined();
    expect(cachedToken).toBe(token);
  });

  it("Test axios instance", async () => {
    expect(authClientService).toBeDefined();
    const instance = authClientService.axiosInstance();
    expect(instance).toBeDefined();
    expect(instance.interceptors.request["handlers"]?.length).toBe(1);
    const additionalInstance = authClientService.axiosInstance({
      baseURL: "https://example.com"
    });
    expect(additionalInstance).toBeDefined();
    expect(additionalInstance.defaults.baseURL).toBe("https://example.com");

    const returnToken = await additionalInstance.post("returnToken");
    expect(returnToken.data.token).toBe(
      `Bearer ${await authClientService.getToken()}`
    );
  });

  it("propagates delegation headers for user initiated calls", async () => {
    const instance = authClientService.axiosInstance({
      baseURL: "https://example.com"
    });

    const request: any = {
      headers: {},
      requestContext: {
        caller: {
          sub: "user-123",
          type: "user",
          username: "user@example.com",
          permissions: ["read:cp.catalog"]
        },
        isOnBehalfOf: false,
        environment: { timestamp: new Date() }
      }
    };

    const response = await RequestContext.cls.run(
      new RequestContext("corr-123", request, {} as any),
      () => instance.post("returnToken")
    );

    expect(JSON.parse(response.data.originalActor)).toMatchObject({
      sub: "user-123",
      type: "user",
      username: "user@example.com"
    });
    expect(response.data.delegationChain).toBe("[]");
    expect(response.data.effectivePermissions).toBe("read:cp.catalog");
    expect(response.data.correlationId).toBe("corr-123");
    expect(response.data.originTimestamp).toBeDefined();
  });

  it("does not create delegation headers for azp-only service calls", async () => {
    const instance = authClientService.axiosInstance({
      baseURL: "https://example.com"
    });

    const request: any = {
      headers: {},
      user: {
        sub: "service-123",
        azp: "control-plane",
        permissions: ["read:cp.catalog"]
      }
    };

    const response = await RequestContext.cls.run(
      new RequestContext("corr-service", request, {} as any),
      () => instance.post("returnToken")
    );

    expect(response.data.originalActor).toBeNull();
    expect(response.data.delegationChain).toBeNull();
    expect(response.data.effectivePermissions).toBeNull();
    expect(response.data.correlationId).toBeNull();
    expect(response.data.originTimestamp).toBeNull();
  });
});
