import { REQUEST } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaginationOptionsDto, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { UserDto } from "@tsg-dsp/sso-bridge-dtos/dist/users.dto.js";
import { plainToInstance } from "class-transformer";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthRole } from "../model/role.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { RolesService } from "../roles/roles.service.js";
import { UsersService } from "./users.service.js";

describe("UsersService Tests", () => {
  let usersService: UsersService;
  let rolesService: RolesService;
  let userRole: OauthRole;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([OauthUser, OauthRole, OauthClient]),
        TypeOrmModule.forFeature([OauthUser, OauthRole, OauthClient])
      ],
      providers: [
        UsersService,
        RolesService,
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

    usersService = module.get<UsersService>(UsersService);
    rolesService = module.get<RolesService>(RolesService);
    userRole = await rolesService.createRole({
      name: "user",
      description: "User role"
    });
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("UsersService", () => {
    it("should create a new user", async () => {
      const userData: Partial<UserDto> = {
        username: "Alice",
        password: "password",
        email: "alice@example.com",
        roles: [userRole.name],
        grants: ["authorization_code"]
      };
      const user = await usersService.createUser(userData);
      expect(user).toHaveProperty("id");
      expect(user.username).toEqual("Alice");
    });

    it("should retrieve users", async () => {
      await usersService.createUser({
        username: "Bob",
        password: "password",
        email: "bob@example.com",
        roles: [userRole.name],
        grants: ["authorization_code"]
      });
      const users = await usersService.getUsers(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(users.total).toBeGreaterThanOrEqual(1);

      const user = await usersService.getUserByEmail("bob@example.com");
      expect(user.username).toEqual("Bob");
      expect(user.roles).toContainEqual(userRole);
    });

    it("should update an existing user", async () => {
      const user = await usersService.createUser({
        username: "Charlie",
        password: "password",
        email: "charlie@example.com",
        roles: [userRole.name],
        grants: ["authorization_code"]
      });
      const updated = await usersService.updateUser(user.id, {
        username: "Charles"
      });
      expect(updated.username).toEqual("Charles");
    });

    it("should throw error when updating non-existent user", async () => {
      await expect(
        usersService.updateUser(9999, { username: "DoesNotExist" } as any)
      ).rejects.toThrowError();
    });

    it("should delete an existing user", async () => {
      const user = await usersService.createUser({
        username: "Delta",
        password: "password",
        email: "delta@example.com",
        roles: [userRole.name],
        grants: ["authorization_code"]
      });
      const result = await usersService.deleteUser(user.id);
      expect(result.deleted).toEqual(true);
    });

    it("should throw error when deleting non-existent user", async () => {
      await expect(usersService.deleteUser(9999)).rejects.toThrow("not found");
    });
  });
});
