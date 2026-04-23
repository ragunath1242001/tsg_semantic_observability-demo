import { beforeEach, describe, expect, it, vi } from "vitest";

import { SdkErrorCode } from "../utils/errors.js";
import { SsoSdk } from "./sso.sdk.js";

describe("SsoSdk", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should get access token with client_secret_post auth", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    const mockTokenResponse = {
      access_token: "sso-token",
      token_type: "Bearer",
      expires_in: 3600
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify(mockTokenResponse), {
        headers: { "content-type": "application/json" }
      });
    });

    const sso = new SsoSdk("http://sso.example.com", {
      method: "client_secret_post",
      clientId: "my-client",
      clientSecret: "my-secret"
    });

    const token = await sso.getAccessToken();
    expect(token).toBe("sso-token");
  });

  it("should throw AUTH_FAILED when no auth config is provided", async () => {
    const sso = new SsoSdk("http://sso.example.com");

    await expect(sso.getAccessToken()).rejects.toMatchObject({
      code: SdkErrorCode.AUTH_FAILED
    });
  });

  it("should get OpenID configuration", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockOpenIdConfig), {
        headers: { "content-type": "application/json" }
      })
    );

    const sso = new SsoSdk("http://sso.example.com");
    const config = await sso.getOpenIdConfiguration();
    expect(config.issuer).toBe("http://sso.example.com");
    expect(config.token_endpoint).toBe("http://sso.example.com/oauth/token");
  });

  it("should throw REQUEST_FAILED when OpenID config fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not found", { status: 404 })
    );

    const sso = new SsoSdk("http://sso.example.com");
    await expect(sso.getOpenIdConfiguration()).rejects.toMatchObject({
      code: SdkErrorCode.REQUEST_FAILED
    });
  });

  it("should get JWKS", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    const mockJwks = {
      keys: [{ kty: "EC", crv: "P-256", kid: "key-1" }]
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify(mockJwks), {
        headers: { "content-type": "application/json" }
      });
    });

    const sso = new SsoSdk("http://sso.example.com");
    const jwks = await sso.getJwks();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kid).toBe("key-1");
  });

  it("should exchange authorization code", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    const mockTokenResponse = {
      access_token: "exchanged-token",
      token_type: "Bearer",
      expires_in: 3600
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("openid-configuration")) {
          return new Response(JSON.stringify(mockOpenIdConfig), {
            headers: { "content-type": "application/json" }
          });
        }
        return new Response(JSON.stringify(mockTokenResponse), {
          headers: { "content-type": "application/json" }
        });
      });

    const sso = new SsoSdk("http://sso.example.com");
    const result = await sso.exchangeAuthorizationCode(
      "auth-code-123",
      "http://localhost/callback",
      "my-client",
      "code-verifier-123"
    );
    expect(result.access_token).toBe("exchanged-token");

    const tokenCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("/oauth/token")
    );
    expect(tokenCall).toBeDefined();
    const body = (tokenCall![1] as RequestInit).body as string;
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=auth-code-123");
    expect(body).toContain("code_verifier=code-verifier-123");
  });

  it("should refresh access token", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    const mockTokenResponse = {
      access_token: "refreshed-token",
      token_type: "Bearer",
      expires_in: 3600
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("openid-configuration")) {
          return new Response(JSON.stringify(mockOpenIdConfig), {
            headers: { "content-type": "application/json" }
          });
        }
        return new Response(JSON.stringify(mockTokenResponse), {
          headers: { "content-type": "application/json" }
        });
      });

    const sso = new SsoSdk("http://sso.example.com");
    const result = await sso.refreshAccessToken(
      "refresh-token-123",
      "my-client"
    );
    expect(result.access_token).toBe("refreshed-token");

    const tokenCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("/oauth/token")
    );
    const body = (tokenCall![1] as RequestInit).body as string;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=refresh-token-123");
  });

  it("should throw NOT_CONFIGURED when using management without ssoBridgeClient", () => {
    const sso = new SsoSdk("http://sso.example.com");

    expect(() => sso.management.getUsers()).toThrow();
  });

  it("should throw AUTH_FAILED when auth code exchange fails", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("Bad Request", { status: 400 });
    });

    const sso = new SsoSdk("http://sso.example.com");
    await expect(
      sso.exchangeAuthorizationCode(
        "bad-code",
        "http://localhost/callback",
        "my-client"
      )
    ).rejects.toMatchObject({ code: SdkErrorCode.AUTH_FAILED });
  });

  it("should throw AUTH_FAILED when token refresh fails", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("Invalid token", { status: 401 });
    });

    const sso = new SsoSdk("http://sso.example.com");
    await expect(
      sso.refreshAccessToken("bad-refresh-token", "my-client")
    ).rejects.toMatchObject({ code: SdkErrorCode.AUTH_FAILED });
  });

  it("should throw REQUEST_FAILED when JWKS fetch fails", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const sso = new SsoSdk("http://sso.example.com");
    await expect(sso.getJwks()).rejects.toMatchObject({
      code: SdkErrorCode.REQUEST_FAILED
    });
  });

  it("should exchange authorization code without code verifier", async () => {
    const mockOpenIdConfig = {
      issuer: "http://sso.example.com",
      token_endpoint: "http://sso.example.com/oauth/token",
      jwks_uri: "http://sso.example.com/.well-known/jwks.json"
    };

    const mockTokenResponse = {
      access_token: "exchanged-token",
      token_type: "Bearer"
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("openid-configuration")) {
          return new Response(JSON.stringify(mockOpenIdConfig), {
            headers: { "content-type": "application/json" }
          });
        }
        return new Response(JSON.stringify(mockTokenResponse), {
          headers: { "content-type": "application/json" }
        });
      });

    const sso = new SsoSdk("http://sso.example.com");
    const result = await sso.exchangeAuthorizationCode(
      "auth-code",
      "http://localhost/callback",
      "my-client"
      // no code verifier
    );
    expect(result.access_token).toBe("exchanged-token");

    const tokenCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("/oauth/token")
    );
    const body = (tokenCall![1] as RequestInit).body as string;
    expect(body).not.toContain("code_verifier");
  });
});
