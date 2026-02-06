import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServerConfig, TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request } from "express";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { RecoveryCode } from "../model/recovery-code.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { PermissionsService } from "../permissions/permissions.service.js";
import { UsersService } from "../users/users.service.js";
import { getSession } from "../utils/session.js";
import { AuthService } from "./auth.service.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TotpService } from "./totp.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";
import { WebAuthnService } from "./webauthn.service.js";

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: UsersService;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const config = plainToInstance(ServerConfig, {});
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          OauthUser,
          OauthClient,
          RecoveryCode,
          TotpCredential,
          WebAuthnCredential
        ]),
        TypeOrmModule.forFeature([
          OauthUser,
          OauthClient,
          RecoveryCode,
          TotpCredential,
          WebAuthnCredential
        ])
      ],
      providers: [
        AuthService,
        PermissionsService,
        UsersService,
        TotpService,
        RecoveryCodeService,
        WebAuthnService,
        TwoFactorHelper,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        },
        {
          provide: ServerConfig,
          useValue: config
        }
      ]
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);

    await usersService.createUser({
      id: "1",
      username: "Alice",
      password: "password",
      email: "alice@example.com",
      permissions: ["manage:*"],
      grants: ["authorization_code"]
    });
    await usersService.createUser({
      id: "2",
      username: "Bob",
      password: "password",
      email: "bob@example.com",
      permissions: ["manage:*"],
      grants: ["authorization_code"]
    });
  });
  describe("Test Auth Service Session handling", () => {
    it("No session", async () => {
      const user = await usersService.getUser("1");
      const request: Request = {} as Request;

      const loginResult = await authService.login("Alice", "password", request);

      expect(loginResult).toEqual({
        id: user.id,
        username: user.username,
        email: user.email,
        require2FA: false,
        permissions: expect.arrayContaining(["manage:sso.user"]),
        grants: ["authorization_code"]
      });
      expect(request.session).toBeUndefined();
      await authService.logout(request);
    });
    it("Empty session and logout", async () => {
      const user = await usersService.getUser("1");
      const request = {
        session: {}
      } as unknown as Request;
      const loginResult = await authService.login("Alice", "password", request);

      const expectedDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        require2FA: false,
        permissions: expect.arrayContaining(["manage:sso.user"]),
        grants: ["authorization_code"]
      };

      expect(loginResult).toEqual(expectedDto);
      expect(request.session).toBeDefined();
      expect(getSession(request)?.user).toEqual(user);

      await authService.logout(request);
      expect(getSession(request)?.user).toBeUndefined();
    });
    it("Session with user", async () => {
      const user = await usersService.getUser("1");
      const user2 = await usersService.getUser("2");
      const requestWithUserSession = {
        session: {
          user: user2
        }
      } as unknown as Request;

      const loginResult3 = await authService.login(
        "Alice",
        "password",
        requestWithUserSession
      );

      const expectedDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        require2FA: false,
        permissions: expect.arrayContaining(["manage:sso.user"]),
        grants: ["authorization_code"]
      };

      expect(loginResult3).toEqual(expectedDto);
      expect(requestWithUserSession.session).toBeDefined();
      expect(getSession(requestWithUserSession)?.user).toEqual(user);
    });
  });

  describe("2FA login and verification", () => {
    let user2FA: OauthUser;
    let totpService: TotpService;
    let recoveryCodeService: RecoveryCodeService;

    beforeAll(async () => {
      totpService = authService["totpService"];
      recoveryCodeService = authService["recoveryCodeService"];

      // Create a user with 2FA enabled
      user2FA = await usersService.createUser({
        username: "User2FA",
        password: "password",
        email: "user2fa@example.com",
        permissions: ["manage:*"],
        grants: ["authorization_code"],
        require2FA: true
      });
    });

    beforeEach(async () => {
      // Clean up credentials and recovery codes before each test
      await totpService.credentialRepository.delete({ userId: user2FA.id });
      await recoveryCodeService["recoveryCodeRepository"].delete({
        userId: user2FA.id
      });
    });

    it("should require 2FA setup when user has 2FA enabled but no credentials", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      const loginResult = await authService.login(
        "User2FA",
        "password",
        request
      );

      expect(loginResult).toMatchObject({
        status: "2fa_setup_required",
        user: {
          id: user2FA.id,
          username: user2FA.username,
          email: user2FA.email
        }
      });
      expect(getSession(request)?.pendingTwoFactor).toMatchObject({
        userId: user2FA.id,
        username: user2FA.username,
        passwordVerified: true
      });
    });

    it("should require 2FA verification when user has credentials", async () => {
      // Setup TOTP credential
      const secret = totpService["generateSecret"]();
      const credential = await totpService["createCredential"](
        user2FA.id,
        secret,
        "Test Device"
      );
      credential.isVerified = true;
      await totpService.credentialRepository.save(credential);

      const request = {
        session: {}
      } as unknown as Request;

      const loginResult = await authService.login(
        "User2FA",
        "password",
        request
      );

      expect(loginResult).toMatchObject({
        status: "2fa_required",
        user: {
          id: user2FA.id,
          username: user2FA.username,
          email: user2FA.email
        },
        hasTotpCredentials: true,
        hasWebAuthnCredentials: false
      });
    });

    it("should verify 2FA with valid TOTP token", async () => {
      const secret = totpService["generateSecret"]();
      const credential = await totpService["createCredential"](
        user2FA.id,
        secret,
        "Test Device"
      );
      credential.isVerified = true;
      await totpService.credentialRepository.save(credential);

      const token = (await import("otplib")).authenticator.generate(secret);

      const request = {
        session: {
          pendingTwoFactor: {
            userId: user2FA.id,
            username: user2FA.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const result = await authService.verify2FA(token, request);

      expect(result).toMatchObject({
        id: user2FA.id,
        username: user2FA.username,
        email: user2FA.email
      });
      expect(getSession(request)?.user).toBeDefined();
      expect(getSession(request)?.pendingTwoFactor).toBeUndefined();
    });

    it("should throw error when verifying 2FA without pending session", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      await expect(authService.verify2FA("123456", request)).rejects.toThrow(
        "No pending 2FA verification"
      );
    });

    it("should throw error with invalid 2FA token and recovery code", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: user2FA.id,
            username: user2FA.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      await expect(
        authService.verify2FA("invalid-token", request)
      ).rejects.toThrow("Invalid 2FA or recovery code");
    });
  });
});
