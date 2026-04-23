import createClient from "openapi-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { paths } from "../../.generated/wallet.js";
import { WalletSdk } from "./wallet.sdk.js";

const mockFetch = vi.fn();

function createTestClient() {
  return createClient<paths>({
    baseUrl: "http://localhost:3001",
    fetch: mockFetch as any
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("WalletSdk", () => {
  let wallet: WalletSdk;

  beforeEach(() => {
    mockFetch.mockReset();
    wallet = new WalletSdk(createTestClient());
  });

  // ── Signing ──────────────────────────────────────────────────────────

  it("should sign JWT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ jwt: "signed.jwt.token" }));

    const result = await wallet.signJwt({
      body: { sub: "user-1" },
      audience: "aud-1"
    } as any);
    expect(result.jwt).toBe("signed.jwt.token");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/signature/sign/jwt");
  });

  it("should validate JWT", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ sub: "user-1", valid: true })
    );

    const result = await wallet.validateJwt({ jwt: "some.jwt.token" } as any);
    expect(result).toBeTruthy();
  });

  // ── Credentials ──────────────────────────────────────────────────────

  it("should list credentials", async () => {
    const mockCredentials = [{ id: "cred-1" }, { id: "cred-2" }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mockCredentials));

    const result = await wallet.listCredentials();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("cred-1");
  });

  it("should return empty array when no credentials", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    const result = await wallet.listCredentials();
    expect(result).toEqual([]);
  });

  it("should get credential by ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "cred-1", type: "VC" }));

    const result = await wallet.getCredential("cred-1");
    expect(result.id).toBe("cred-1");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/credentials/cred-1");
  });

  it("should delete credential by ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "deleted" }));

    await wallet.deleteCredential("cred-1");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("DELETE");
    expect(req.url).toContain("/management/credentials/cred-1");
  });

  it("should revoke credential", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "revoked" }));

    await wallet.revokeCredential("cred-1");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/management/credentials/cred-1/revoke");
  });

  it("should get credential config", async () => {
    const mockConfig = { trustAnchors: [], issueConfigurations: [] };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockConfig));

    const result = await wallet.getCredentialConfig();
    expect(result).toEqual(mockConfig);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/credentials/config");
  });

  it("should list dataspace credentials", async () => {
    const mockCreds = [{ id: "ds-cred-1" }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mockCreds));

    const result = await wallet.listDataspaceCredentials();
    expect(result).toHaveLength(1);
  });

  it("should return empty array when no dataspace credentials", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    const result = await wallet.listDataspaceCredentials();
    expect(result).toEqual([]);
  });

  // ── DID Management ───────────────────────────────────────────────────

  it("should get DID document", async () => {
    const mockDid = { id: "did:example:123", verificationMethod: [] };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockDid));

    const result = await wallet.getDidDocument();
    expect(result.id).toBe("did:example:123");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/did");
  });

  it("should get DID services", async () => {
    const mockServices = [
      {
        id: "svc-1",
        type: "LinkedDomain",
        serviceEndpoint: "https://example.com"
      }
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(mockServices));

    const result = await wallet.getDidServices();
    expect(result).toHaveLength(1);
  });

  // ── Key Management ───────────────────────────────────────────────────

  it("should list keys", async () => {
    const mockKeys = [
      {
        id: "key-1",
        type: "EdDSA",
        default: true,
        publicKey: { kty: "OKP", crv: "Ed25519" },
        createdDate: "2025-01-01T00:00:00Z",
        modifiedDate: "2025-01-01T00:00:00Z"
      }
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(mockKeys));

    const result = await wallet.listKeys();
    expect(result).toHaveLength(1);
  });

  it("should get key by ID", async () => {
    const mockKey = {
      id: "key-1",
      type: "EdDSA",
      default: true,
      publicKey: { kty: "OKP", crv: "Ed25519" },
      createdDate: "2025-01-01T00:00:00Z",
      modifiedDate: "2025-01-01T00:00:00Z"
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockKey));

    const result = await wallet.getKey("key-1");
    expect(result.id).toBe("key-1");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/keys/key-1");
  });

  it("should delete key by ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "deleted" }));

    await wallet.deleteKey("key-1");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("DELETE");
    expect(req.url).toContain("/management/keys/key-1");
  });

  it("should set default key", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    await wallet.setDefaultKey("key-1");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("PUT");
    expect(req.url).toContain("/management/keys/key-1/default");
  });

  // ── Issuance ─────────────────────────────────────────────────────────

  it("should create credential offer", async () => {
    const mockOffer = {
      credential_issuer: "issuer-1",
      credential_configuration_ids: ["config-1"]
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockOffer));

    const result = await wallet.createOffer({
      credentialType: "VerifiableCredential",
      credentialSubject: {} as any
    } as any);
    expect(result.credential_issuer).toBe("issuer-1");
  });

  it("should request offer via DCP", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    await wallet.requestOfferViaDcp({
      credential_issuer: "issuer-1",
      credential_type: "VC"
    } as any);

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/management/issuance/request/dcp");
  });

  it("should get offer by ID", async () => {
    const mockOffer = {
      status: "PENDING",
      credential_issuer: "issuer-1",
      credential_configuration_ids: ["config-1"]
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockOffer));

    const result = await wallet.getOffer("offer-1");
    expect(result.status).toBe("PENDING");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/issuance/offers/offer-1");
  });

  it("should revoke offer by ID", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: "revoked" }));

    await wallet.revokeOffer("offer-1");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("PUT");
    expect(req.url).toContain("/management/issuance/offers/offer-1/revoke");
  });
});
