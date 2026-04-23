import { describe, expect, it } from "vitest";

import { TsgSdk } from "./tsg-sdk.js";
import { SdkErrorCode } from "./utils/errors.js";

describe("TsgSdk", () => {
  it("should create SDK with minimal config", () => {
    const sdk = TsgSdk.create({
      controlPlaneBaseUrl: "http://localhost:3000"
    });

    expect(sdk.catalog).toBeDefined();
    expect(sdk.negotiations).toBeDefined();
    expect(sdk.transfers).toBeDefined();
  });

  it("should create SDK with full config", () => {
    const sdk = TsgSdk.create({
      controlPlaneBaseUrl: "http://localhost:3000",
      walletBaseUrl: "http://localhost:3001",
      ssoBridgeBaseUrl: "http://localhost:3002",
      auth: {
        method: "client_secret_post",
        clientId: "my-client",
        clientSecret: "my-secret"
      }
    });

    expect(sdk.catalog).toBeDefined();
    expect(sdk.negotiations).toBeDefined();
    expect(sdk.transfers).toBeDefined();
    expect(sdk.wallet).toBeDefined();
    expect(sdk.sso).toBeDefined();
  });

  it("should throw NOT_CONFIGURED when using wallet without walletBaseUrl", () => {
    const sdk = TsgSdk.create({
      controlPlaneBaseUrl: "http://localhost:3000"
    });

    expect(() => (sdk.wallet as any).signJwt({})).toThrow();
    try {
      (sdk.wallet as any).signJwt({});
    } catch (e: any) {
      expect(e.code).toBe(SdkErrorCode.NOT_CONFIGURED);
    }
  });

  it("should throw NOT_CONFIGURED when using sso without ssoBridgeBaseUrl", () => {
    const sdk = TsgSdk.create({
      controlPlaneBaseUrl: "http://localhost:3000"
    });

    expect(() => (sdk.sso as any).getAccessToken()).toThrow();
    try {
      (sdk.sso as any).getAccessToken();
    } catch (e: any) {
      expect(e.code).toBe(SdkErrorCode.NOT_CONFIGURED);
    }
  });

  it("should throw NOT_CONFIGURED for nested sso access without ssoBridgeBaseUrl", () => {
    const sdk = TsgSdk.create({
      controlPlaneBaseUrl: "http://localhost:3000"
    });

    expect(() => (sdk.sso as any).management.getUsers()).toThrow();
    try {
      (sdk.sso as any).management.getUsers();
    } catch (e: any) {
      expect(e.code).toBe(SdkErrorCode.NOT_CONFIGURED);
    }
  });
});
