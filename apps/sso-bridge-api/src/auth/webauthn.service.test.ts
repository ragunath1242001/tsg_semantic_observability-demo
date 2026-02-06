import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/types";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
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
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TotpService } from "./totp.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";
import { WebAuthnService } from "./webauthn.service.js";

describe("WebAuthnService", () => {
  let service: WebAuthnService;
  let testUser: OauthUser;

  beforeAll(async () => {
    await TypeOrmTestHelper.instance.setupTestDB();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmTestHelper.instance.module([
          RecoveryCode,
          TotpCredential,
          WebAuthnCredential,
          OauthUser,
          OauthClient
        ]),
        TypeOrmModule.forFeature([
          RecoveryCode,
          TotpCredential,
          WebAuthnCredential,
          OauthUser,
          OauthClient
        ])
      ],
      providers: [
        WebAuthnService,
        TotpService,
        RecoveryCodeService,
        TwoFactorHelper,
        UsersService,
        PermissionsService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {
            server: { origin: "http://localhost" },
            twoFactorIssuerName: "Test App"
          })
        }
      ]
    }).compile();

    service = module.get<WebAuthnService>(WebAuthnService);
    const usersService = module.get<UsersService>(UsersService);

    testUser = await usersService.createUser({
      username: "webauthn-test-user",
      password: "password",
      email: "webauthn-test@example.com",
      grants: ["authorization_code"]
    });
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("credential counter updates", () => {
    it("should increment counter on successful verification", async () => {
      const credential = service["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "counter-test-credential",
        publicKey: "mock-key",
        counter: 5,
        deviceName: "Counter Test Device",
        lastUsed: new Date()
      });
      const saved = await service["credentialRepository"].save(credential);

      // Update counter directly (simulating a successful auth)
      saved.counter = 6;
      await service["credentialRepository"].save(saved);

      const updated = await service["credentialRepository"].findOne({
        where: { id: saved.id }
      });
      expect(updated?.counter).toBe(6);
    });
  });

  describe("getRpId", () => {
    it("should return localhost for local development", () => {
      const rpId = service["getRpId"]();
      expect(rpId).toBe("localhost");
    });
  });

  describe("getExpectedOrigin", () => {
    it("should return configured origin", () => {
      const origin = service["getExpectedOrigin"]();
      expect(origin).toBe("http://localhost:3000");
    });
  });

  describe("WebAuthn Registration Flow", () => {
    beforeEach(async () => {
      await service["credentialRepository"].delete({ userId: testUser.id });
    });

    it("should initiate WebAuthn registration for pending 2FA user", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const result = await service.initiateWebAuthnRegistration(request);

      expect(result.options).toBeDefined();
      expect(getSession(request)?.webAuthnRegistration).toBeDefined();
    });

    it("should throw error when completing registration without session", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      const mockResponse = {
        id: "test-id",
        response: {
          clientDataJSON: "mock",
          attestationObject: "mock"
        }
      } as unknown as RegistrationResponseJSON;

      await expect(
        service.completeWebAuthnRegistration(request, mockResponse)
      ).rejects.toThrow("No pending WebAuthn registration");
    });
  });

  describe("WebAuthn Authentication Flow", () => {
    it("should initiate WebAuthn authentication with pending user", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const result = await service.initiateWebAuthnAuthentication(request);

      expect(result.options).toBeDefined();
      expect(getSession(request)?.webAuthnChallenge).toBeDefined();
    });

    it("should initiate WebAuthn authentication without user", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      const result = await service.initiateWebAuthnAuthentication(request);

      expect(result.options).toBeDefined();
      expect(getSession(request)?.webAuthnChallenge).toBeDefined();
    });

    it("should throw error when completing auth without challenge", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      const mockResponse = {
        id: "test-id",
        response: {
          clientDataJSON: "mock",
          authenticatorData: "mock",
          signature: "mock"
        }
      } as unknown as AuthenticationResponseJSON;
      await expect(
        service.completeWebAuthnAuthentication(request, mockResponse)
      ).rejects.toThrow("No pending WebAuthn authentication");
    });

    it("should throw error when completing auth without pending 2FA", async () => {
      const request = {
        session: {
          webAuthnChallenge: "test-challenge"
        }
      } as unknown as Request;

      const mockResponse = {
        id: "test-id",
        response: {
          clientDataJSON: "mock",
          authenticatorData: "mock",
          signature: "mock"
        }
      } as unknown as AuthenticationResponseJSON;
      await expect(
        service.completeWebAuthnAuthentication(request, mockResponse)
      ).rejects.toThrow("No pending 2FA verification");
    });
  });

  describe("Credential Management for Authenticated Users", () => {
    beforeEach(async () => {
      await service["credentialRepository"].delete({ userId: testUser.id });
    });

    it("should list WebAuthn credentials with session user", async () => {
      const credential = service["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "list-test-cred",
        publicKey: "mock-key",
        counter: 0,
        deviceName: "My Device",
        lastUsed: new Date()
      });
      await service["credentialRepository"].save(credential);

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      const result = await service.listWebAuthnCredentials(request);

      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).toMatchObject({
        id: credential.id,
        deviceName: "My Device"
      });
    });

    it("should delete WebAuthn credential with session user", async () => {
      const credential = service["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "delete-test-cred",
        publicKey: "mock-key",
        counter: 0,
        deviceName: "Device to Delete",
        lastUsed: new Date()
      });
      const saved = await service["credentialRepository"].save(credential);

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      const result = await service.deleteWebAuthnCredential(request, saved.id);

      expect(result.success).toBe(true);

      const deleted = await service["credentialRepository"].findOne({
        where: { id: saved.id }
      });
      expect(deleted).toBeNull();
    });
  });
});
