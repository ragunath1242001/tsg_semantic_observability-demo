import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request } from "express";
import { authenticator } from "otplib";

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

describe("TotpService", () => {
  let service: TotpService;
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
        TotpService,
        RecoveryCodeService,
        TwoFactorHelper,
        UsersService,
        PermissionsService,
        WebAuthnService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {
            server: { origin: "http://localhost" },
            twoFactorIssuerName: "Test App"
          })
        }
      ]
    }).compile();

    service = module.get<TotpService>(TotpService);
    const usersService = module.get<UsersService>(UsersService);

    testUser = await usersService.createUser({
      username: "totp-test-user",
      password: "password",
      email: "totp-test@example.com",
      grants: ["authorization_code"]
    });
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("verifyAnyCredential", () => {
    beforeEach(async () => {
      await service.credentialRepository.delete({ userId: testUser.id });
    });

    it("should verify token against any verified credential", async () => {
      const secret1 = authenticator.generateSecret();
      const cred1 = await service["createCredential"](
        testUser.id,
        secret1,
        "Device 1"
      );
      cred1.isVerified = true;
      await service.credentialRepository.save(cred1);

      const secret2 = authenticator.generateSecret();
      const cred2 = await service["createCredential"](
        testUser.id,
        secret2,
        "Device 2"
      );
      cred2.isVerified = true;
      await service.credentialRepository.save(cred2);

      const token = authenticator.generate(secret2);
      const result = await service.verifyAnyCredential(testUser.id, token);

      expect(result).toBe(true);

      // Check lastUsed was updated
      const updatedCred = await service.credentialRepository.findOne({
        where: { userId: testUser.id, id: cred2.id }
      });
      expect(updatedCred?.lastUsed).toBeDefined();
    });

    it("should return false for invalid token", async () => {
      const secret = authenticator.generateSecret();
      const cred = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );
      cred.isVerified = true;
      await service.credentialRepository.save(cred);

      const result = await service.verifyAnyCredential(testUser.id, "000000");

      expect(result).toBe(false);
    });

    it("should ignore unverified credentials", async () => {
      const secret = authenticator.generateSecret();
      await service["createCredential"](testUser.id, secret, "Device");

      const token = authenticator.generate(secret);
      const result = await service.verifyAnyCredential(testUser.id, token);

      expect(result).toBe(false);
    });
  });

  describe("2FA Setup Flow", () => {
    it("should generate QR code for 2FA setup", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const qrCode = await service.get2FASetupQRCode(request);

      expect(qrCode).toBeDefined();
      expect(qrCode).toContain("data:image/png;base64,");
      expect(getSession(request)?.totpRegistration).toBeDefined();
      expect(getSession(request)?.totpRegistration?.secret).toBeDefined();
    });

    it("should reuse existing registration session when getting QR code", async () => {
      const secret = authenticator.generateSecret();
      const credential = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );

      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          },
          totpRegistration: {
            userId: testUser.id,
            credentialId: credential.id,
            secret
          }
        }
      } as unknown as Request;

      const qrCode = await service.get2FASetupQRCode(request);

      expect(qrCode).toBeDefined();
      expect(getSession(request)?.totpRegistration?.secret).toBe(secret);
    });

    it("should throw error when no pending 2FA setup", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      await expect(service.get2FASetupQRCode(request)).rejects.toThrow(
        "No pending 2FA setup"
      );
    });

    it("should get 2FA setup secret", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const secret = await service.get2FASetupSecret(request);

      expect(secret).toBeDefined();
      expect(typeof secret).toBe("string");
      expect(getSession(request)?.totpRegistration).toBeDefined();
    });

    it("should verify 2FA setup with valid token", async () => {
      const secret = authenticator.generateSecret();
      const credential = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );

      const token = authenticator.generate(secret);

      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          },
          totpRegistration: {
            userId: testUser.id,
            credentialId: credential.id,
            secret
          }
        }
      } as unknown as Request;

      const result = await service.verify2FASetup(request, token);

      expect(result).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });
      expect(getSession(request)?.totpRegistration).toBeUndefined();
    });

    it("should throw error when verifying setup without registration", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      await expect(service.verify2FASetup(request, "123456")).rejects.toThrow(
        "No 2FA secret found"
      );
    });

    it("should throw error with invalid token during setup", async () => {
      const secret = authenticator.generateSecret();
      const credential = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );

      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          },
          totpRegistration: {
            userId: testUser.id,
            credentialId: credential.id,
            secret
          }
        }
      } as unknown as Request;

      await expect(service.verify2FASetup(request, "000000")).rejects.toThrow(
        "Invalid 2FA token"
      );
    });
  });

  describe("TOTP Registration Flow (for authenticated users)", () => {
    it("should initiate TOTP registration for pending 2FA user", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const result = await service.initiateTotpRegistration(request);

      expect(result).toMatchObject({
        credentialId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        secret: expect.any(String),
        qrCode: expect.stringContaining("data:image/png;base64,")
      });
    });

    it("should complete TOTP registration", async () => {
      const secret = authenticator.generateSecret();
      const credential = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );

      const token = authenticator.generate(secret);

      const request = {
        session: {
          totpRegistration: {
            userId: testUser.id,
            credentialId: credential.id,
            secret
          }
        }
      } as unknown as Request;

      const result = await service.completeTotpRegistration(
        request,
        token,
        "My New Device"
      );

      expect(result).toMatchObject({
        success: true,
        credential: {
          id: credential.id,
          deviceName: "My New Device"
        }
      });
    });

    it("should throw error when completing without registration", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      await expect(
        service.completeTotpRegistration(request, "123456")
      ).rejects.toThrow("No pending TOTP registration");
    });
  });

  describe("Credential Management", () => {
    it("should list TOTP credentials for user with session", async () => {
      await service.credentialRepository.delete({ userId: testUser.id });

      const secret = authenticator.generateSecret();
      const cred = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );
      cred.isVerified = true;
      await service.credentialRepository.save(cred);

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      // Directly set the user in the request to bypass getUser
      const getSession = await import("../utils/session.js");
      const session = getSession.getSession(request);
      if (session) {
        session.user = testUser;
      }

      const result = await service.listTotpCredentials(request);

      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).toMatchObject({
        id: cred.id,
        deviceName: "Device",
        isVerified: true
      });
    });

    it("should delete TOTP credential for user with session", async () => {
      const secret = authenticator.generateSecret();
      const cred = await service["createCredential"](
        testUser.id,
        secret,
        "Device"
      );

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      // Directly set the user in the request
      const getSession = await import("../utils/session.js");
      const session = getSession.getSession(request);
      if (session) {
        session.user = testUser;
      }

      const result = await service.deleteTotpCredential(request, cred.id);

      expect(result.success).toBe(true);

      const deleted = await service.credentialRepository.findOne({
        where: { userId: testUser.id, id: cred.id }
      });
      expect(deleted).toBeNull();
    });
  });
});
