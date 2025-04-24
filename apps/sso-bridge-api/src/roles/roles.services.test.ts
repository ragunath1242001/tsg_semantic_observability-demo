import { jest } from "@jest/globals";
import { REQUEST } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaginationOptionsDto, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { UserDto } from "@tsg-dsp/sso-bridge-dtos";
import { ClientDto } from "@tsg-dsp/sso-bridge-dtos/dist/clients.dto.js";
import { plainToInstance } from "class-transformer";

import { ClientsService } from "../clients/clients.service.js";
import { RootConfig } from "../config.js";
import { KubernetesService } from "../k8s/kubernetes.service.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthRole } from "../model/role.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { UsersService } from "../users/users.service.js";
import { RolesService } from "./roles.service.js";

describe("RolesService Tests", () => {
  let clientsService: ClientsService;
  let usersService: UsersService;
  let rolesService: RolesService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthRole, OauthClient, OauthUser]),
        TypeOrmModule.forFeature([OauthRole, OauthClient, OauthUser])
      ],
      providers: [
        RolesService,
        ClientsService,
        UsersService,
        {
          provide: KubernetesService,
          useValue: {
            applySecret: jest.fn()
          }
        },
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        },
        {
          provide: REQUEST,
          useValue: {
            session: {
              user: null
            }
          }
        }
      ]
    }).compile();

    rolesService = module.get<RolesService>(RolesService);
    clientsService = module.get<ClientsService>(ClientsService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("RolesService", () => {
    it("should create a new role", async () => {
      const adminRole = await rolesService.createRole({
        name: "admin",
        description: "Admin user"
      });
      expect(adminRole).toHaveProperty("id");
      expect(adminRole.name).toEqual("admin");
    });

    it("should retrieve roles", async () => {
      await rolesService.createRole({
        name: "user",
        description: "Regular user"
      });
      const roles = await rolesService.getRoles(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(roles.total).toBeGreaterThanOrEqual(1);

      const role = await rolesService.getRoleByName("admin");
      expect(role.name).toEqual("admin");
    });

    it("should update an existing role", async () => {
      const userRole = await rolesService.createRole({
        name: "user",
        description: "Regular user"
      });
      const updated = await rolesService.updateRole(userRole.id, {
        name: "user-updated"
      });
      expect(updated.name).toEqual("user-updated");
    });

    it("should throw error when updating non-existent role", async () => {
      await expect(
        rolesService.updateRole(9999, { name: "doesnotexist" } as any)
      ).rejects.toThrow();
    });

    it("should delete an existing user", async () => {
      const userRole = await rolesService.createRole({
        name: "user",
        description: "Regular user"
      });
      const result = await rolesService.deleteRole(userRole.id);
      expect(result.deleted).toEqual(true);
    });

    it("should throw error when deleting non-existent user", async () => {
      await expect(rolesService.deleteRole(9999)).rejects.toThrow("not found");
    });

    it("should throw an error when deleting a role that is still linked to a client", async () => {
      const userRole = await rolesService.createRole({
        name: "user",
        description: "Regular user"
      });
      const clientData: Partial<ClientDto> = {
        clientId: "test-client",
        clientSecret: "test-secret",
        secretName: "test-secret",
        roles: [userRole.name],
        grants: [],
        name: "Test Client",
        description: "A test client",
        redirectUris: ["http://localhost:3000"]
      };
      await clientsService.createClient(clientData);
      await expect(rolesService.deleteRole(userRole.id)).rejects.toThrow();
    });

    it("should throw an error when deleting a role that is still linked to an user", async () => {
      const userRole = await rolesService.createRole({
        name: "user",
        description: "Regular user"
      });
      const userData: Partial<UserDto> = {
        username: "Alice",
        password: "password",
        email: "alice@example.com",
        roles: [userRole.name],
        grants: ["authorization_code"]
      };
      await usersService.createUser(userData);
      await expect(rolesService.deleteRole(userRole.id)).rejects.toThrow();
    });
  });
});
