import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmTestHelper } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { authenticator } from "otplib";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { RecoveryCode } from "../model/recovery-code.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { OauthUser } from "../model/user.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { PermissionsService } from "../permissions/permissions.service.js";
import { UsersService } from "../users/users.service.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TotpService } from "./totp.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";
import { WebAuthnService } from "./webauthn.service.js";

describe("TwoFactorHelper", () => {
  let helper: TwoFactorHelper;
  let totpService: TotpService;
  let webAuthnService: WebAuthnService;
  let testUser: OauthUser;
  let usersService: UsersService;

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
        TwoFactorHelper,
        TotpService,
        WebAuthnService,
        RecoveryCodeService,
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

    helper = module.get<TwoFactorHelper>(TwoFactorHelper);
    totpService = module.get<TotpService>(TotpService);
    webAuthnService = module.get<WebAuthnService>(WebAuthnService);
    usersService = module.get<UsersService>(UsersService);

    testUser = await usersService.createUser({
      username: "2fa-helper-test-user",
      password: "password",
      email: "2fa-helper@example.com",
      grants: ["authorization_code"]
    });
  });

  afterAll(async () => {
    await TypeOrmTestHelper.instance.teardownTestDB();
  });

  beforeEach(async () => {
    // Clean up credentials before each test
    await totpService.credentialRepository.delete({ userId: testUser.id });
    await webAuthnService["credentialRepository"].delete({
      userId: testUser.id
    });
  });

  describe("has2FACredentials", () => {
    it("should return false when user has no credentials", async () => {
      const result = await helper.has2FACredentials(testUser.id);
      expect(result).toBe(false);
    });

    it("should return true when user has verified TOTP credentials", async () => {
      const secret = authenticator.generateSecret();
      const credential = await totpService["createCredential"](
        testUser.id,
        secret,
        "Test Device"
      );
      credential.isVerified = true;
      await totpService.credentialRepository.save(credential);

      const result = await helper.has2FACredentials(testUser.id);
      expect(result).toBe(true);
    });

    it("should return false when user has unverified TOTP credentials", async () => {
      const secret = authenticator.generateSecret();
      await totpService["createCredential"](testUser.id, secret, "Test Device");

      const result = await helper.has2FACredentials(testUser.id);
      expect(result).toBe(false);
    });

    it("should return true when user has WebAuthn credentials", async () => {
      const credential = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-id",
        publicKey: "mock-public-key",
        counter: 0,
        deviceName: "WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(credential);

      const result = await helper.has2FACredentials(testUser.id);
      expect(result).toBe(true);
    });

    it("should return true when user has both TOTP and WebAuthn credentials", async () => {
      // Add TOTP credential
      const secret = authenticator.generateSecret();
      const totpCred = await totpService["createCredential"](
        testUser.id,
        secret,
        "TOTP Device"
      );
      totpCred.isVerified = true;
      await totpService.credentialRepository.save(totpCred);

      // Add WebAuthn credential
      const webAuthnCred = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-id",
        publicKey: "mock-public-key",
        counter: 0,
        deviceName: "WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(webAuthnCred);

      const result = await helper.has2FACredentials(testUser.id);
      expect(result).toBe(true);
    });
  });

  describe("hasVerifiedTotpCredentials", () => {
    it("should return false when user has no TOTP credentials", async () => {
      const result = await helper.hasVerifiedTotpCredentials(testUser.id);
      expect(result).toBe(false);
    });

    it("should return true when user has verified TOTP credentials", async () => {
      const secret = authenticator.generateSecret();
      const credential = await totpService["createCredential"](
        testUser.id,
        secret,
        "Test Device"
      );
      credential.isVerified = true;
      await totpService.credentialRepository.save(credential);

      const result = await helper.hasVerifiedTotpCredentials(testUser.id);
      expect(result).toBe(true);
    });

    it("should return false when user has only unverified TOTP credentials", async () => {
      const secret = authenticator.generateSecret();
      await totpService["createCredential"](testUser.id, secret, "Test Device");

      const result = await helper.hasVerifiedTotpCredentials(testUser.id);
      expect(result).toBe(false);
    });
  });

  describe("hasWebAuthnCredentials", () => {
    it("should return false when user has no WebAuthn credentials", async () => {
      const result = await helper.hasWebAuthnCredentials(testUser.id);
      expect(result).toBe(false);
    });

    it("should return true when user has WebAuthn credentials", async () => {
      const credential = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-id",
        publicKey: "mock-public-key",
        counter: 0,
        deviceName: "WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(credential);

      const result = await helper.hasWebAuthnCredentials(testUser.id);
      expect(result).toBe(true);
    });
  });

  describe("getVerifiedTotpCredentialsCount", () => {
    it("should return 0 when user has no TOTP credentials", async () => {
      const count = await helper["getVerifiedTotpCredentialsCount"](
        testUser.id
      );
      expect(count).toBe(0);
    });

    it("should return count of verified TOTP credentials only", async () => {
      const secret1 = authenticator.generateSecret();
      const cred1 = await totpService["createCredential"](
        testUser.id,
        secret1,
        "Device 1"
      );
      cred1.isVerified = true;
      await totpService.credentialRepository.save(cred1);

      const secret2 = authenticator.generateSecret();
      const cred2 = await totpService["createCredential"](
        testUser.id,
        secret2,
        "Device 2"
      );
      cred2.isVerified = true;
      await totpService.credentialRepository.save(cred2);

      // Add an unverified one
      const secret3 = authenticator.generateSecret();
      await totpService["createCredential"](testUser.id, secret3, "Device 3");

      const count = await helper["getVerifiedTotpCredentialsCount"](
        testUser.id
      );
      expect(count).toBe(2);
    });
  });

  describe("getWebAuthnCredentialsCount", () => {
    it("should return 0 when user has no WebAuthn credentials", async () => {
      const count = await helper["getWebAuthnCredentialsCount"](testUser.id);
      expect(count).toBe(0);
    });

    it("should return count of WebAuthn credentials", async () => {
      const cred1 = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-1",
        publicKey: "mock-key-1",
        counter: 0,
        deviceName: "Device 1",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(cred1);

      const cred2 = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-2",
        publicKey: "mock-key-2",
        counter: 0,
        deviceName: "Device 2",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(cred2);

      const count = await helper["getWebAuthnCredentialsCount"](testUser.id);
      expect(count).toBe(2);
    });
  });

  describe("isInitial2FASetup", () => {
    it("should return true for first TOTP credential when no WebAuthn exists", async () => {
      const secret = authenticator.generateSecret();
      const credential = await totpService["createCredential"](
        testUser.id,
        secret,
        "First Device"
      );
      credential.isVerified = true;
      await totpService.credentialRepository.save(credential);

      const result = await helper.isInitial2FASetup(testUser.id, "totp");
      expect(result).toBe(true);
    });

    it("should return false for second TOTP credential", async () => {
      const secret1 = authenticator.generateSecret();
      const cred1 = await totpService["createCredential"](
        testUser.id,
        secret1,
        "Device 1"
      );
      cred1.isVerified = true;
      await totpService.credentialRepository.save(cred1);

      const secret2 = authenticator.generateSecret();
      const cred2 = await totpService["createCredential"](
        testUser.id,
        secret2,
        "Device 2"
      );
      cred2.isVerified = true;
      await totpService.credentialRepository.save(cred2);

      const result = await helper.isInitial2FASetup(testUser.id, "totp");
      expect(result).toBe(false);
    });

    it("should return false when TOTP is added but WebAuthn already exists", async () => {
      // Add WebAuthn first
      const webAuthnCred = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred",
        publicKey: "mock-key",
        counter: 0,
        deviceName: "WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(webAuthnCred);

      // Add TOTP
      const secret = authenticator.generateSecret();
      const totpCred = await totpService["createCredential"](
        testUser.id,
        secret,
        "TOTP Device"
      );
      totpCred.isVerified = true;
      await totpService.credentialRepository.save(totpCred);

      const result = await helper.isInitial2FASetup(testUser.id, "totp");
      expect(result).toBe(false);
    });

    it("should return true for first WebAuthn credential when no TOTP exists", async () => {
      const credential = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred",
        publicKey: "mock-key",
        counter: 0,
        deviceName: "First WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(credential);

      const result = await helper.isInitial2FASetup(testUser.id, "webauthn");
      expect(result).toBe(true);
    });

    it("should return false for second WebAuthn credential", async () => {
      const cred1 = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-1",
        publicKey: "mock-key-1",
        counter: 0,
        deviceName: "Device 1",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(cred1);

      const cred2 = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred-2",
        publicKey: "mock-key-2",
        counter: 0,
        deviceName: "Device 2",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(cred2);

      const result = await helper.isInitial2FASetup(testUser.id, "webauthn");
      expect(result).toBe(false);
    });

    it("should return false when WebAuthn is added but TOTP already exists", async () => {
      // Add TOTP first
      const secret = authenticator.generateSecret();
      const totpCred = await totpService["createCredential"](
        testUser.id,
        secret,
        "TOTP Device"
      );
      totpCred.isVerified = true;
      await totpService.credentialRepository.save(totpCred);

      // Add WebAuthn
      const webAuthnCred = webAuthnService["credentialRepository"].create({
        userId: testUser.id,
        credentialId: "webauthn-cred",
        publicKey: "mock-key",
        counter: 0,
        deviceName: "WebAuthn Device",
        lastUsed: new Date()
      });
      await webAuthnService["credentialRepository"].save(webAuthnCred);

      const result = await helper.isInitial2FASetup(testUser.id, "webauthn");
      expect(result).toBe(false);
    });
  });
});
