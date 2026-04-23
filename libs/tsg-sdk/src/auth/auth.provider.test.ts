import { exportJWK, generateKeyPair } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/auth.provider.js";
import { SdkErrorCode } from "../utils/errors.js";

const mockOpenIdConfig = {
  issuer: "http://sso.example.com",
  token_endpoint: "http://sso.example.com/oauth/token",
  jwks_uri: "http://sso.example.com/.well-known/jwks.json"
};

function mockFetchForAuth(
  tokenResponse: object = {
    access_token: "acquired-token",
    token_type: "Bearer",
    expires_in: 3600
  }
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes("openid-configuration")) {
      return new Response(JSON.stringify(mockOpenIdConfig), {
        headers: { "content-type": "application/json" }
      });
    }
    if (urlStr.includes("/oauth/token")) {
      return new Response(JSON.stringify(tokenResponse), {
        headers: { "content-type": "application/json" }
      });
    }
    return new Response("Not found", { status: 404 });
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return undefined when no auth config is provided", async () => {
    const provider = new AuthProvider(undefined, undefined);
    const token = await provider.getAccessToken();
    expect(token).toBeUndefined();
  });

  it("should return empty headers when no auth config is provided", async () => {
    const provider = new AuthProvider(undefined, undefined);
    const headers = await provider.getAuthHeaders();
    expect(headers).toEqual({});
  });

  it("should return static access token for access_token method", async () => {
    const provider = new AuthProvider(
      { method: "access_token", accessToken: "my-token" },
      undefined
    );
    const token = await provider.getAccessToken();
    expect(token).toBe("my-token");
  });

  it("should return authorization header for access_token method", async () => {
    const provider = new AuthProvider(
      { method: "access_token", accessToken: "my-token" },
      undefined
    );
    const headers = await provider.getAuthHeaders();
    expect(headers).toEqual({ Authorization: "Bearer my-token" });
  });

  it("should acquire token with client_secret_post", async () => {
    const fetchSpy = mockFetchForAuth();

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      },
      "http://sso.example.com"
    );

    const token = await provider.getAccessToken();
    expect(token).toBe("acquired-token");

    const tokenCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("/oauth/token")
    );
    expect(tokenCall).toBeDefined();
    const body = (tokenCall![1] as RequestInit).body as string;
    expect(body).toContain("grant_type=client_credentials");
    expect(body).toContain("client_id=my-client");
    expect(body).toContain("client_secret=my-secret");
  });

  it("should acquire token with private_key_jwt", async () => {
    const fetchSpy = mockFetchForAuth();

    const ecKeyPair = await generateKeyPair("ES256", { extractable: true });
    const jwk = await exportJWK(ecKeyPair.privateKey);
    jwk.alg = "ES256";

    const provider = new AuthProvider(
      {
        method: "private_key_jwt",
        clientId: "jwt-client",
        privateKeyJwk: jwk
      },
      "http://sso.example.com"
    );

    const token = await provider.getAccessToken();
    expect(token).toBe("acquired-token");

    const tokenCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("/oauth/token")
    );
    const body = (tokenCall![1] as RequestInit).body as string;
    expect(body).toContain("grant_type=client_credentials");
    expect(body).toContain("client_id=jwt-client");
    expect(body).toContain("client_assertion_type=");
    expect(body).toContain("client_assertion=");
  });

  it("should cache token and reuse on subsequent calls", async () => {
    const fetchSpy = mockFetchForAuth();

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      },
      "http://sso.example.com"
    );

    const token1 = await provider.getAccessToken();
    const token2 = await provider.getAccessToken();
    expect(token1).toBe("acquired-token");
    expect(token2).toBe("acquired-token");

    const tokenCalls = fetchSpy.mock.calls.filter((c) =>
      c[0].toString().includes("/oauth/token")
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it("should use default expiry when expires_in is not provided", async () => {
    mockFetchForAuth({
      access_token: "no-expiry-token",
      token_type: "Bearer"
    });

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      },
      "http://sso.example.com"
    );

    const token = await provider.getAccessToken();
    expect(token).toBe("no-expiry-token");

    // Should still be cached (using 5min default)
    const token2 = await provider.getAccessToken();
    expect(token2).toBe("no-expiry-token");
  });

  it("should throw AUTH_FAILED when token endpoint returns error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes("openid-configuration")) {
        return new Response(JSON.stringify(mockOpenIdConfig), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("Unauthorized", { status: 401 });
    });

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "wrong-secret"
      },
      "http://sso.example.com"
    );

    await expect(provider.getAccessToken()).rejects.toMatchObject({
      code: SdkErrorCode.AUTH_FAILED
    });
  });

  it("should use openIdConfigurationUrl when provided", async () => {
    const fetchSpy = mockFetchForAuth();

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret",
        openIdConfigurationUrl:
          "http://custom.example.com/.well-known/openid-configuration"
      },
      undefined
    );

    await provider.getAccessToken();

    const openIdCall = fetchSpy.mock.calls.find((c) =>
      c[0].toString().includes("custom.example.com")
    );
    expect(openIdCall).toBeDefined();
  });

  it("should throw INVALID_CONFIG when no openid URL can be determined", async () => {
    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      },
      undefined // no ssoBridgeBaseUrl
    );

    await expect(provider.getAccessToken()).rejects.toMatchObject({
      code: SdkErrorCode.INVALID_CONFIG
    });
  });

  it("should throw AUTH_FAILED when openid-configuration fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not found", { status: 404 })
    );

    const provider = new AuthProvider(
      {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      },
      "http://sso.example.com"
    );

    await expect(provider.getAccessToken()).rejects.toMatchObject({
      code: SdkErrorCode.AUTH_FAILED
    });
  });
});
