import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaginationOptionsDto, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos/dist/clients.dto.js";
import { plainToInstance } from "class-transformer";
import { vi } from "vitest";

import { RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { PermissionsService } from "../permissions/permissions.service.js";
import { ClientsService } from "./clients.service.js";

describe("ClientsService", () => {
  let clientsService: ClientsService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthClient, OauthUser]),
        TypeOrmModule.forFeature([OauthClient, OauthUser])
      ],
      providers: [
        ClientsService,
        PermissionsService,
        {
          provide: KubernetesService,
          useValue: {
            applySecret: vi.fn()
          }
        },
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        }
      ]
    }).compile();

    clientsService = module.get<ClientsService>(ClientsService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  it("should create a new client", async () => {
    const clientData: Partial<ClientDto> = {
      clientId: "test-client",
      clientSecret: "test-secret",
      secretName: "test-secret",
      permissions: ["manage:*"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Test Client",
      description: "A test client",
      redirectUris: ["http://localhost:3000"]
    };
    const created = await clientsService.createClient(clientData);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Client");
  });

  it("should retrieve clients (including the recently created one)", async () => {
    const clients = await clientsService.getClients(
      PaginationOptionsDto.NO_PAGINATION
    );
    expect(Array.isArray(clients.data)).toBeTruthy();
    expect(clients.total).toBeGreaterThan(0);
    // Verify that at least one client has the name "Test Client"
    const found = clients.data.find((client) => client.name === "Test Client");
    expect(found).toBeDefined();
  });

  it("should update an existing client", async () => {
    // First create a client to update
    const clientData: Partial<ClientDto> = {
      clientId: "updateable-client",
      clientSecret: "test-secret",
      secretName: "test-secret",
      permissions: ["manage:*"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Updateable Client",
      description: "A test client",
      redirectUris: ["http://localhost:3000"]
    };
    const created = await clientsService.createClient(clientData);
    const updatedData = {
      ...clientData,
      name: "Updated Client"
    };

    const updated = await clientsService.updateClient(created.id, updatedData);
    expect(updated).toBeDefined();
    expect(updated.id).toEqual(created.id);
    expect(updated.name).toBe("Updated Client");
  });

  it("should throw error when updating a non-existent client", async () => {
    await expect(
      clientsService.updateClient("999999", { name: "Non-existent" })
    ).rejects.toThrow();
  });

  it("should delete an existing client", async () => {
    // First create a client to delete
    const clientData: Partial<ClientDto> = {
      clientId: "deletable-client",
      clientSecret: "test-secret",
      secretName: "test-secret",
      permissions: ["manage:*"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Deletable Client",
      description: "A test client",
      redirectUris: ["http://localhost:3000"]
    };
    const created = await clientsService.createClient(clientData);
    const response = await clientsService.deleteClient(created.id);
    expect(response).toEqual({ deleted: true });

    // Confirm deletion by attempting to update the deleted client
    await expect(
      clientsService.updateClient(created.id, { name: "Should not work" })
    ).rejects.toThrow();
  });

  it("should throw error when deleting a non-existent client", async () => {
    await expect(clientsService.deleteClient("999999")).rejects.toThrow();
  });
});
