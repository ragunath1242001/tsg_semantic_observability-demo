import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaginationOptionsDto, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { UserWithPasswordDto } from "@tsg-dsp/sso-bridge-dtos/dist/users.dto.js";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

import { RecoveryCodeService } from "../auth/recovery-code.service.js";
import { TotpService } from "../auth/totp.service.js";
import { TwoFactorHelper } from "../auth/two-factor.helper.js";
import { WebAuthnService } from "../auth/webauthn.service.js";
import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { RecoveryCode } from "../model/recovery-code.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { PermissionsService } from "../permissions/permissions.service.js";
import { UsersService } from "./users.service.js";

describe("UsersService Tests", () => {
  let usersService: UsersService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          OauthUser,
          OauthClient,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ]),
        TypeOrmModule.forFeature([
          OauthUser,
          OauthClient,
          TotpCredential,
          WebAuthnCredential,
          RecoveryCode
        ])
      ],
      providers: [
        UsersService,
        PermissionsService,
        TotpService,
        WebAuthnService,
        RecoveryCodeService,
        TwoFactorHelper,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        }
      ]
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("UsersService", () => {
    it("should create a new user", async () => {
      const userData: Partial<UserWithPasswordDto> = {
        username: "Alice",
        password: "password",
        email: "alice@example.com",
        permissions: ["manage:*"],
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
        permissions: ["manage:*"],
        grants: ["authorization_code"]
      });
      const users = await usersService.getUsers(
        PaginationOptionsDto.NO_PAGINATION
      );
      expect(users.total).toBeGreaterThanOrEqual(1);

      const user = await usersService.getUserByEmail("bob@example.com");
      expect(user.username).toEqual("Bob");
      expect(user.permissions).toContain("manage:sso.user");
    });

    it("should update an existing user", async () => {
      const user = await usersService.createUser({
        username: "Charlie",
        password: "password",
        email: "charlie@example.com",
        permissions: ["manage:*"],
        grants: ["authorization_code"]
      });
      const updated = await usersService.updateUser(user.id, {
        username: "Charles"
      });
      expect(updated.username).toEqual("Charles");
    });

    it("should throw error when updating non-existent user", async () => {
      await expect(
        usersService.updateUser("9999", { username: "DoesNotExist" } as any)
      ).rejects.toThrow();
    });

    it("should delete an existing user", async () => {
      const user = await usersService.createUser({
        username: "Delta",
        password: "password",
        email: "delta@example.com",
        permissions: ["manage:*"],
        grants: ["authorization_code"]
      });
      const result = await usersService.deleteUser(
        user.id,
        {} as unknown as Request
      );
      expect(result.deleted).toEqual(true);
    });

    it("should throw error when deleting non-existent user", async () => {
      await expect(
        usersService.deleteUser("9999", {} as unknown as Request)
      ).rejects.toThrow("not found");
    });
  });
});
