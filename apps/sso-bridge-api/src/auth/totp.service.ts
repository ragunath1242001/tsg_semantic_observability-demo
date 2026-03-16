import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { Request } from "express";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { UsersService } from "../users/users.service.js";
import {
  getSession,
  getUserIdentity,
  requireAuthenticatedUser
} from "../utils/session.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";

@Injectable()
export class TotpService {
  constructor(
    @InjectRepository(TotpCredential)
    public readonly credentialRepository: Repository<TotpCredential>,
    private readonly usersService: UsersService,
    private readonly rootConfig: RootConfig,
    private readonly twoFactorHelper: TwoFactorHelper,
    private readonly recoveryCodeService: RecoveryCodeService
  ) {}
  private readonly logger: Logger = new Logger(this.constructor.name);

  async verifyAnyCredential(userId: string, token: string): Promise<boolean> {
    const credentials = await this.credentialRepository.find({
      where: { userId, isVerified: true }
    });

    for (const credential of credentials) {
      const isValid = await this.verifyToken(token, credential.secret);
      if (isValid) {
        credential.lastUsed = new Date();
        // eslint-disable-next-line no-await-in-loop
        await this.credentialRepository.save(credential);
        return true;
      }
    }

    return false;
  }

  async get2FASetupQRCode(request: Request): Promise<string> {
    const session = getSession(request);
    this.twoFactorHelper.validatePending2FASetup(session, "2FA", this.logger);

    if (
      !session?.pendingTwoFactor?.userId ||
      !session?.pendingTwoFactor?.username
    ) {
      throw new AppError("No pending session", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const userId = session.pendingTwoFactor.userId;
    const username = session.pendingTwoFactor.username;

    if (!session?.totpRegistration) {
      const secret = generateSecret();
      const credential = await this.createCredential(userId, secret);

      session!.totpRegistration = {
        userId: userId,
        credentialId: credential.id,
        secret
      };
    }

    const { secret } = session!.totpRegistration;

    return await this.generateQRCode(username, secret);
  }

  async get2FASetupSecret(request: Request): Promise<string> {
    const session = getSession(request);
    this.twoFactorHelper.validatePending2FASetup(session, "2FA", this.logger);

    if (!session?.pendingTwoFactor?.userId) {
      throw new AppError("No pending session", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const userId = session.pendingTwoFactor.userId;

    if (!session?.totpRegistration) {
      const secret = generateSecret();
      const credential = await this.createCredential(userId, secret);

      session!.totpRegistration = {
        userId: userId,
        credentialId: credential.id,
        secret
      };
    }

    return session!.totpRegistration.secret;
  }

  async verify2FASetup(request: Request, token: string) {
    const session = getSession(request);
    this.twoFactorHelper.validatePending2FASetup(session, "2FA", this.logger);

    if (
      !session?.pendingTwoFactor?.userId ||
      !session?.pendingTwoFactor?.username
    ) {
      throw new AppError("No pending session", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const userId = session.pendingTwoFactor.userId;
    const username = session.pendingTwoFactor.username;

    if (!session?.totpRegistration) {
      throw new AppError("No 2FA secret found", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const { credentialId } = session.totpRegistration;

    const isValid = await this.verifyCredential(userId, credentialId, token);

    if (!isValid) {
      throw new AppError("Invalid 2FA token", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    session.totpRegistration = undefined;

    const result =
      await this.recoveryCodeService.generateRecoveryCodesForInitial2FASetup(
        userId,
        "totp"
      );

    return {
      id: userId,
      username: username,
      ...result
    };
  }

  async initiateTotpRegistration(request: Request) {
    const { userId, username } = getUserIdentity(request, this.logger);
    const session = getSession(request);

    const secret = generateSecret();
    const credential = await this.createCredential(userId, secret);

    if (session) {
      session.totpRegistration = {
        userId,
        credentialId: credential.id,
        secret
      };
    }

    const qrCode = await this.generateQRCode(username, secret);

    return {
      credentialId: credential.id,
      secret,
      qrCode
    };
  }

  async completeTotpRegistration(
    request: Request,
    token: string,
    deviceName?: string
  ) {
    const session = getSession(request);

    if (!session?.totpRegistration) {
      throw new AppError(
        "No pending TOTP registration",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const { userId, credentialId } = session.totpRegistration;

    const isValid = await this.verifyCredential(userId, credentialId, token);

    if (!isValid) {
      throw new AppError("Invalid TOTP token", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    session.totpRegistration = undefined;

    const credential = await this.credentialRepository.findOne({
      where: { userId, id: credentialId }
    });

    if (credential && deviceName) {
      credential.deviceName = deviceName;
      await this.credentialRepository.save(credential);
    }

    const result =
      await this.recoveryCodeService.generateRecoveryCodesForInitial2FASetup(
        userId,
        "totp"
      );

    return {
      success: true,
      credential: {
        id: credential!.id,
        deviceName: credential!.deviceName,
        createdDate: credential!.createdDate
      },
      ...result
    };
  }

  async listTotpCredentials(request: Request) {
    const user = requireAuthenticatedUser(request, this.logger);

    const credentials = await this.getUserCredentials(user.id);

    return {
      credentials: credentials.map((cred) => ({
        id: cred.id,
        deviceName: cred.deviceName,
        isVerified: cred.isVerified,
        createdDate: cred.createdDate,
        lastUsed: cred.lastUsed
      }))
    };
  }

  async deleteTotpCredential(request: Request, credentialId: string) {
    const user = requireAuthenticatedUser(request, this.logger);
    await this.credentialRepository.delete({
      userId: user.id,
      id: credentialId
    });

    return { success: true };
  }

  async enable2FA(request: Request) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    await this.usersService.getUser(currentUser.id);

    const hasTotpCredentials =
      await this.twoFactorHelper.hasVerifiedTotpCredentials(currentUser.id);
    if (hasTotpCredentials) {
      throw new AppError(
        "2FA is already enabled",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const secret = generateSecret();
    await this.createCredential(currentUser.id, secret);

    await this.usersService.setRequire2FA(currentUser.id, true);

    return {
      success: true,
      message:
        "2FA secret generated. Please verify with your authenticator app."
    };
  }

  async disable2FA(request: Request, password: string) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    const isValid = await this.usersService.verifyPassword(
      currentUser.id,
      password
    );
    if (!isValid) {
      throw new AppError(
        "Password is incorrect",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    await this.twoFactorHelper.deleteAll2FACredentials(currentUser.id);
    await this.usersService.setRequire2FA(currentUser.id, false);

    return { success: true };
  }

  async reset2FA(request: Request, password: string) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    const has2FACredentials = await this.twoFactorHelper.has2FACredentials(
      currentUser.id
    );
    if (!has2FACredentials) {
      throw new AppError("2FA is not enabled", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const isValid = await this.usersService.verifyPassword(
      currentUser.id,
      password
    );
    if (!isValid) {
      throw new AppError(
        "Password is incorrect",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    await this.twoFactorHelper.deleteAll2FACredentials(currentUser.id);

    return {
      success: true,
      message:
        "2FA has been reset. You will need to set it up again on your next login."
    };
  }

  async get2FAQRCodeForProfile(request: Request) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    const user = await this.usersService.getUser(currentUser.id);
    const credentials = await this.getUserCredentials(user.id);

    if (credentials.length === 0) {
      throw new AppError("2FA is not enabled", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const credential = credentials[0];
    const qrCode = await this.generateQRCode(user.username, credential.secret);
    return { qrCode };
  }

  async get2FASecretForProfile(request: Request) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    const credentials = await this.getUserCredentials(currentUser.id);

    if (credentials.length === 0) {
      throw new AppError("2FA is not enabled", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    return { secret: credentials[0].secret };
  }

  async verify2FASetupForProfile(request: Request, token: string) {
    const currentUser = requireAuthenticatedUser(request, this.logger);

    const credentials = await this.getUserCredentials(currentUser.id);

    if (credentials.length === 0) {
      throw new AppError("2FA is not enabled", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const unverifiedCredential = credentials.find((c) => !c.isVerified);
    if (!unverifiedCredential) {
      throw new AppError("No pending 2FA setup", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const isValid = await this.verifyCredential(
      currentUser.id,
      unverifiedCredential.id,
      token
    );
    if (!isValid) {
      throw new AppError("Invalid 2FA token", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    return { success: true, message: "2FA setup verified successfully" };
  }

  private async generateQRCode(
    username: string,
    secret: string
  ): Promise<string> {
    const otpauthUrl = generateURI({
      issuer: this.rootConfig.twoFactorIssuerName,
      label: username,
      secret
    });
    return await QRCode.toDataURL(otpauthUrl);
  }

  private async verifyToken(token: string, secret: string): Promise<boolean> {
    try {
      const result = await verify({ token, secret });
      return result.valid;
    } catch (_error) {
      return false;
    }
  }

  private async createCredential(
    userId: string,
    secret: string,
    deviceName?: string
  ): Promise<TotpCredential> {
    const credential = this.credentialRepository.create({
      userId,
      secret,
      deviceName: deviceName || "TOTP Authenticator",
      isVerified: false,
      lastUsed: null
    });

    return await this.credentialRepository.save(credential);
  }

  private async verifyCredential(
    userId: string,
    credentialId: string,
    token: string
  ): Promise<boolean> {
    const credential = await this.credentialRepository.findOne({
      where: { userId, id: credentialId }
    });

    if (!credential) {
      return false;
    }

    const isValid = await this.verifyToken(token, credential.secret);

    if (isValid) {
      credential.isVerified = true;
      credential.lastUsed = new Date();
      await this.credentialRepository.save(credential);
      return true;
    }

    return false;
  }

  private async getUserCredentials(userId: string): Promise<TotpCredential[]> {
    return await this.credentialRepository.find({
      where: { userId },
      order: { createdDate: "DESC" }
    });
  }
}
