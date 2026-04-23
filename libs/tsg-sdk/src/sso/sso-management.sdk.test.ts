import createClient from "openapi-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { paths } from "../../.generated/sso-bridge.js";
import { SsoManagementSdk } from "./sso-management.sdk.js";

const mockFetch = vi.fn();

function createTestClient() {
  return createClient<paths>({
    baseUrl: "http://localhost:3002",
    fetch: mockFetch as any
  });
}

describe("SsoManagementSdk", () => {
  let management: SsoManagementSdk;

  beforeEach(() => {
    mockFetch.mockReset();
    management = new SsoManagementSdk(createTestClient());
  });

  // ── Users ──────────────────────────────────────────────────────────────

  it("should list users", async () => {
    const mockUsers = [
      {
        id: "1",
        username: "alice",
        email: "alice@example.com",
        permissions: ["read"],
        grants: ["authorization_code"]
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockUsers), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.getUsers();
    expect(result).toEqual(mockUsers);
  });

  it("should list users with pagination", async () => {
    const mockUsers = [
      {
        id: "2",
        username: "bob",
        email: "bob@example.com",
        permissions: ["write"],
        grants: ["client_credentials"]
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockUsers), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.getUsers({
      page: 2,
      perPage: 10,
      order: "DESC"
    });
    expect(result).toEqual(mockUsers);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("per_page=10");
    expect(calledUrl).toContain("order=DESC");
  });

  it("should create user", async () => {
    const mockUser = {
      id: "3",
      username: "charlie",
      email: "charlie@example.com",
      permissions: ["read"],
      grants: ["authorization_code"]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.createUser({
      username: "charlie",
      password: "secret"
    } as any);
    expect(result).toEqual(mockUser);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/users/create");
  });

  it("should update user", async () => {
    const mockUser = {
      id: "1",
      username: "alice-updated",
      email: "alice@example.com",
      permissions: ["read", "write"],
      grants: ["authorization_code"]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.updateUser("1", {
      username: "alice-updated"
    } as any);
    expect(result).toEqual(mockUser);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/users/update/1");
  });

  it("should delete user", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await management.deleteUser("1");
    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/users/1");
  });

  it("should reset user 2FA", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await management.resetUser2FA("1");
    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/users/1/reset-2fa");
  });

  // ── Clients ────────────────────────────────────────────────────────────

  it("should list clients", async () => {
    const mockClients = [
      {
        id: "client-1",
        name: "My App",
        secretName: "secret1",
        description: "Test app",
        clientId: "cid-1",
        permissions: ["read"],
        grants: ["client_credentials"],
        redirectUris: ["http://localhost"]
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockClients), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.getClients();
    expect(result).toEqual(mockClients);
  });

  it("should create client", async () => {
    const mockClient = {
      id: "client-2",
      name: "New App",
      secretName: "secret2",
      description: "New app",
      clientId: "cid-2",
      permissions: ["write"],
      grants: ["authorization_code"],
      redirectUris: ["http://localhost/cb"]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockClient), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.createClient({
      name: "New App"
    } as any);
    expect(result).toEqual(mockClient);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/clients/create");
  });

  it("should update client", async () => {
    const mockClient = {
      id: "client-1",
      name: "Updated App",
      secretName: "secret1",
      description: "Updated app",
      clientId: "cid-1",
      permissions: ["read", "write"],
      grants: ["client_credentials"],
      redirectUris: ["http://localhost"]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockClient), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.updateClient("client-1", {
      name: "Updated App"
    } as any);
    expect(result).toEqual(mockClient);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/clients/update/client-1");
  });

  it("should delete client", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await management.deleteClient("client-1");
    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/clients/client-1");
  });

  // ── Permissions ────────────────────────────────────────────────────────

  it("should get permissions", async () => {
    const mockPermissions = ["read", "write", "admin"];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockPermissions), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await management.getPermissions();
    expect(result).toEqual(mockPermissions);
  });
});
