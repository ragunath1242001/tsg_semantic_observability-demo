import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import * as bcrypt from "bcrypt";
import { plainToInstance } from "class-transformer";
import { Request } from "express";
import { generateSecret } from "otplib";
import { Repository } from "typeorm";

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

describe("RecoveryCodeService", () => {
  let service: RecoveryCodeService;
  let usersService: UsersService;
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
        RecoveryCodeService,
        TwoFactorHelper,
        UsersService,
        PermissionsService,
        TotpService,
        WebAuthnService,
        {
          provide: RootConfig,
          useValue: plainToInstance(RootConfig, {})
        }
      ]
    }).compile();

    service = module.get<RecoveryCodeService>(RecoveryCodeService);
    usersService = module.get<UsersService>(UsersService);

    // Create a test user
    testUser = await usersService.createUser({
      username: "recovery-test-user",
      password: "password",
      email: "recovery-test@example.com",
      grants: ["authorization_code"]
    });
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  describe("generateRecoveryCodes", () => {
    it("should generate 10 recovery codes and save them to the database", async () => {
      const codes = await service["generateRecoveryCodes"](testUser.id);

      expect(codes).toHaveLength(10);
      expect(codes.every((code) => code.length > 0)).toBe(true);

      // Verify codes are stored in database
      const storedCodes = await service["recoveryCodeRepository"].find({
        where: { userId: testUser.id }
      });
      expect(storedCodes).toHaveLength(10);
      expect(storedCodes.every((code) => !code.used)).toBe(true);
    });

    it("should hash the recovery codes before saving", async () => {
      const codes = await service["generateRecoveryCodes"](testUser.id);
      const plainCode = codes[0];

      const storedCodes = await service["recoveryCodeRepository"].find({
        where: { userId: testUser.id }
      });

      // Hash should not match plain code
      expect(storedCodes[0].codeHash).not.toBe(plainCode);

      // But hash should verify against plain code
      const isValid = await bcrypt.compare(plainCode, storedCodes[0].codeHash);
      expect(isValid).toBe(true);
    });
  });

  describe("verifyAndUseRecoveryCode", () => {
    let recoveryCodes: string[];

    beforeEach(async () => {
      // Clean existing codes
      await service["recoveryCodeRepository"].delete({ userId: testUser.id });
      recoveryCodes = await service["generateRecoveryCodes"](testUser.id);
    });

    it("should verify and mark a valid recovery code as used", async () => {
      const validCode = recoveryCodes[0];

      const result = await service.verifyAndUseRecoveryCode(
        testUser.id,
        validCode
      );

      expect(result).toBe(true);

      // Verify code is marked as used
      const usedCode = await service["recoveryCodeRepository"].findOne({
        where: { userId: testUser.id, used: true }
      });
      expect(usedCode).toBeDefined();
    });

    it("should not verify an invalid recovery code", async () => {
      const invalidCode = "invalid-code-12345";

      const result = await service.verifyAndUseRecoveryCode(
        testUser.id,
        invalidCode
      );

      expect(result).toBe(false);
    });

    it("should not verify a recovery code that has already been used", async () => {
      const validCode = recoveryCodes[0];

      // Use the code once
      await service.verifyAndUseRecoveryCode(testUser.id, validCode);

      // Try to use it again
      const result = await service.verifyAndUseRecoveryCode(
        testUser.id,
        validCode
      );

      expect(result).toBe(false);
    });
  });

  describe("getRemainingCodesCount", () => {
    beforeEach(async () => {
      await service["recoveryCodeRepository"].delete({ userId: testUser.id });
    });

    it("should return the count of remaining (unused) recovery codes", async () => {
      const codes = await service["generateRecoveryCodes"](testUser.id);

      let count = await service.getRemainingCodesCount(testUser.id);
      expect(count).toBe(10);

      // Use one code
      await service.verifyAndUseRecoveryCode(testUser.id, codes[0]);

      count = await service.getRemainingCodesCount(testUser.id);
      expect(count).toBe(9);
    });

    it("should return 0 if user has no recovery codes", async () => {
      const count = await service.getRemainingCodesCount(testUser.id);
      expect(count).toBe(0);
    });
  });

  describe("regenerateRecoveryCodes", () => {
    let totpCredentialRepo: Repository<TotpCredential>;

    beforeAll(async () => {
      totpCredentialRepo =
        service["recoveryCodeRepository"].manager.connection.getRepository(
          TotpCredential
        );
    });

    beforeEach(async () => {
      await service["recoveryCodeRepository"].delete({ userId: testUser.id });
    });

    it("should regenerate recovery codes for user with 2FA enabled", async () => {
      // Setup 2FA for the user
      const secret = generateSecret();
      const credential = totpCredentialRepo.create({
        userId: testUser.id,
        secret,
        deviceName: "Device",
        isVerified: true
      });
      await totpCredentialRepo.save(credential);

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      const result = await service.regenerateRecoveryCodes(request);

      expect(result.recoveryCodes).toHaveLength(10);
      expect(result.message).toContain("Save these recovery codes");

      // Cleanup
      await totpCredentialRepo.delete({ userId: testUser.id });
    });
  });

  describe("getRecoveryCodesStatus", () => {
    beforeEach(async () => {
      await service["recoveryCodeRepository"].delete({ userId: testUser.id });
    });

    it("should return remaining codes count", async () => {
      await service["generateRecoveryCodes"](testUser.id);

      const request = {
        session: {
          user: testUser
        }
      } as unknown as Request;

      const result = await service.getRecoveryCodesStatus(request);

      expect(result.remainingCount).toBe(10);
    });
  });

  describe("acknowledgeRecoveryCodes", () => {
    it("should complete login after acknowledging recovery codes", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: testUser.id,
            username: testUser.username,
            passwordVerified: true
          }
        }
      } as unknown as Request;

      const result = await service.acknowledgeRecoveryCodes(request);
      const session = getSession(request);
      expect(result).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
      expect(session?.user).toBeDefined();
      expect(session?.pendingTwoFactor).toBeUndefined();
    });

    it("should throw error when no pending session", async () => {
      const request = {
        session: {}
      } as unknown as Request;

      await expect(service.acknowledgeRecoveryCodes(request)).rejects.toThrow(
        "No pending session"
      );
    });

    it("should throw error when user not found", async () => {
      const request = {
        session: {
          pendingTwoFactor: {
            userId: 99999,
            username: "nonexistent",
            passwordVerified: true
          }
        }
      } as unknown as Request;

      await expect(service.acknowledgeRecoveryCodes(request)).rejects.toThrow(
        "User with id 99999 not found"
      );
    });
  });
});
