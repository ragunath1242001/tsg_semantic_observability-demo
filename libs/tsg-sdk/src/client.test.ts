import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./auth/auth.provider.js";
import {
  createControlPlaneClient,
  createSsoBridgeClient,
  createWalletClient
} from "./client.js";
import { SdkErrorCode } from "./utils/errors.js";

describe("client factories", () => {
  let authProvider: AuthProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create control plane client with auth and error middleware", () => {
    authProvider = new AuthProvider(
      { method: "access_token", accessToken: "test-token" },
      undefined
    );
    const client = createControlPlaneClient(
      "http://localhost:3000",
      authProvider
    );
    expect(client).toBeDefined();
  });

  it("should create wallet client", () => {
    authProvider = new AuthProvider(
      { method: "access_token", accessToken: "test-token" },
      undefined
    );
    const client = createWalletClient("http://localhost:3001", authProvider);
    expect(client).toBeDefined();
  });

  it("should create SSO bridge client", () => {
    authProvider = new AuthProvider(
      { method: "access_token", accessToken: "test-token" },
      undefined
    );
    const client = createSsoBridgeClient("http://localhost:3002", authProvider);
    expect(client).toBeDefined();
  });

  it("should add authorization header via auth middleware", async () => {
    authProvider = new AuthProvider(
      { method: "access_token", accessToken: "my-token" },
      undefined
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        headers: { "content-type": "application/json" }
      })
    );

    const client = createControlPlaneClient(
      "http://localhost:3000",
      authProvider
    );
    await client.GET("/management/negotiations");

    const req = fetchSpy.mock.calls[0][0] as Request;
    expect(req.headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("should throw NOT_FOUND for 404 responses via error middleware", async () => {
    authProvider = new AuthProvider(undefined, undefined);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not found", { status: 404 })
    );

    const client = createControlPlaneClient(
      "http://localhost:3000",
      authProvider
    );

    await expect(client.GET("/management/negotiations")).rejects.toMatchObject({
      code: SdkErrorCode.NOT_FOUND
    });
  });

  it("should throw AUTH_FAILED for 401 responses via error middleware", async () => {
    authProvider = new AuthProvider(undefined, undefined);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );

    const client = createControlPlaneClient(
      "http://localhost:3000",
      authProvider
    );

    await expect(client.GET("/management/negotiations")).rejects.toMatchObject({
      code: SdkErrorCode.AUTH_FAILED
    });
  });

  it("should throw REQUEST_FAILED for 500 responses via error middleware", async () => {
    authProvider = new AuthProvider(undefined, undefined);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal server error", { status: 500 })
    );

    const client = createControlPlaneClient(
      "http://localhost:3000",
      authProvider
    );

    await expect(client.GET("/management/negotiations")).rejects.toMatchObject({
      code: SdkErrorCode.REQUEST_FAILED
    });
  });
});
