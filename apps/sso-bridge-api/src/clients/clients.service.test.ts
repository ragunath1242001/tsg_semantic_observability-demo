import { Test, TestingModule } from "@nestjs/testing";
import { ClientsService } from "./clients.service.js";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { OauthClient } from "../model/client.dao.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { plainToInstance } from "class-transformer";
import { RootConfig } from "../config.js";

describe("ClientsService", () => {
  let service: ClientsService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    let module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthClient]),
        TypeOrmModule.forFeature([OauthClient])
      ],
      providers: [
        ClientsService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        }
      ]
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  it("should create a new client", async () => {
    const clientData: Partial<OauthClient> = {
      clientId: "test-client",
      clientSecret: "test-secret",
      roles: ["user"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Test Client",
      description: "A test client"
    };
    const created = await service.createClient(clientData);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Client");
  });

  it("should retrieve clients (including the recently created one)", async () => {
    const clients = await service.getClients();
    expect(Array.isArray(clients)).toBeTruthy();
    expect(clients.length).toBeGreaterThan(0);
    // Verify that at least one client has the name "Test Client"
    const found = clients.find((client) => client.name === "Test Client");
    expect(found).toBeDefined();
  });

  it("should update an existing client", async () => {
    // First create a client to update
    const clientData: Partial<OauthClient> = {
      clientId: "updateable-client",
      clientSecret: "test-secret",
      roles: ["user"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Updateable Client",
      description: "A test client"
    };
    const created = await service.createClient(clientData);
    const updatedData = {
      ...clientData,
      name: "Updated Client"
    };

    const updated = await service.updateClient(created.id, updatedData);
    expect(updated).toBeDefined();
    expect(updated.id).toEqual(created.id);
    expect(updated.name).toBe("Updated Client");
  });

  it("should throw error when updating a non-existent client", async () => {
    await expect(
      service.updateClient(999999, { name: "Non-existent" })
    ).rejects.toThrow();
  });

  it("should delete an existing client", async () => {
    // First create a client to delete
    const clientData: Partial<OauthClient> = {
      clientId: "deletable-client",
      clientSecret: "test-secret",
      roles: ["user"],
      grants: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials"
      ],
      name: "Deletable Client",
      description: "A test client"
    };
    const created = await service.createClient(clientData);
    const response = await service.deleteClient(created.id);
    expect(response).toEqual({ deleted: true });

    // Confirm deletion by attempting to update the deleted client
    await expect(
      service.updateClient(created.id, { name: "Should not work" })
    ).rejects.toThrow();
  });

  it("should throw error when deleting a non-existent client", async () => {
    await expect(service.deleteClient(999999)).rejects.toThrow();
  });
});
