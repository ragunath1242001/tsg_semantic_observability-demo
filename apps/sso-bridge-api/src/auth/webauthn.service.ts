import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON
} from "@simplewebauthn/types";
import { AppError } from "@tsg-dsp/common-api";
import { Request } from "express";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { UsersService } from "../users/users.service.js";
import {
  getSession,
  getUserIdentity,
  requireAuthenticatedUser
} from "../utils/session.js";
import { oauthUserToDto } from "../utils/user.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";

export interface RegistrationOptions {
  challenge: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface AuthenticationOptions {
  challenge: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

@Injectable()
export class WebAuthnService {
  constructor(
    @InjectRepository(WebAuthnCredential)
    private readonly credentialRepository: Repository<WebAuthnCredential>,
    private readonly usersService: UsersService,
    private readonly rootConfig: RootConfig,
    private readonly twoFactorHelper: TwoFactorHelper,
    private readonly recoveryCodeService: RecoveryCodeService
  ) {}
  private readonly logger: Logger = new Logger(this.constructor.name);

  async initiateWebAuthnRegistration(request: Request) {
    const { userId, username } = getUserIdentity(request, this.logger);
    const session = getSession(request);
    const existingCredentials = await this.credentialRepository.find({
      where: { userId }
    });
    const options = await generateRegistrationOptions({
      rpName: this.rootConfig.twoFactorIssuerName,
      rpID: this.getRpId(),
      userID: new TextEncoder().encode(userId.toString()),
      userName: username,
      timeout: 60000,
      attestationType: "none",
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred"
      }
    });

    if (session) {
      session.webAuthnRegistration = {
        userId,
        challenge: options.challenge
      };
    }

    return { options };
  }

  async completeWebAuthnRegistration(
    request: Request,
    response: RegistrationResponseJSON,
    deviceName?: string
  ) {
    const session = getSession(request);

    if (!session?.webAuthnRegistration) {
      throw new AppError(
        "No pending WebAuthn registration",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const { userId, challenge } = session.webAuthnRegistration;

    try {
      const credential = await this.verifyRegistration(
        userId,
        response,
        challenge,
        deviceName
      );

      session.webAuthnRegistration = undefined;

      const result =
        await this.recoveryCodeService.generateRecoveryCodesForInitial2FASetup(
          userId,
          "webauthn"
        );

      return {
        success: true,
        credential: {
          id: credential.id,
          deviceName: credential.deviceName,
          createdDate: credential.createdDate
        },
        ...result
      };
    } catch (error) {
      this.logger.error("WebAuthn registration failed", error);
      throw new AppError(
        `WebAuthn registration failed`,
        HttpStatus.BAD_REQUEST,
        error
      ).andLog(this.logger);
    }
  }

  async initiateWebAuthnAuthentication(request: Request) {
    const session = getSession(request);

    const userId = session?.pendingTwoFactor?.userId;

    const { challenge, options } =
      await this.generateAuthenticationOptions(userId);

    if (session) {
      session.webAuthnChallenge = challenge;
    }

    return { options };
  }

  async completeWebAuthnAuthentication(
    request: Request,
    response: AuthenticationResponseJSON
  ) {
    const session = getSession(request);

    if (!session?.webAuthnChallenge) {
      throw new AppError(
        "No pending WebAuthn authentication",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    if (!session?.pendingTwoFactor?.userId) {
      throw new AppError(
        "No pending 2FA verification",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const { userId } = session.pendingTwoFactor;
    const challenge = session.webAuthnChallenge;

    try {
      const verified = await this.verifyAuthentication(
        userId,
        response,
        challenge
      );

      if (!verified) {
        throw new AppError(
          "WebAuthn verification failed",
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }

      const user = await this.usersService.getUser(userId);
      session.user = user;
      session.pendingTwoFactor = undefined;
      session.webAuthnChallenge = undefined;

      return oauthUserToDto(user);
    } catch (error) {
      throw new AppError(
        `WebAuthn authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
  }

  async listWebAuthnCredentials(request: Request) {
    const user = requireAuthenticatedUser(request, this.logger);

    const credentials = await this.credentialRepository.find({
      where: { userId: user.id },
      order: { createdDate: "DESC" }
    });

    return {
      credentials: credentials.map((cred) => ({
        id: cred.id,
        deviceName: cred.deviceName,
        createdDate: cred.createdDate,
        lastUsed: cred.lastUsed
      }))
    };
  }

  async deleteWebAuthnCredential(request: Request, credentialId: string) {
    const user = requireAuthenticatedUser(request, this.logger);

    await this.credentialRepository.delete({
      userId: user.id,
      id: credentialId
    });

    return { success: true };
  }

  private async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    deviceName?: string
  ): Promise<WebAuthnCredential> {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.getExpectedOrigin(),
      expectedRPID: this.getRpId(),
      requireUserVerification: false
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AppError(
        "Registration verification failed",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const { credential } = verification.registrationInfo;

    const credentialEntity = this.credentialRepository.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      deviceName: deviceName || "WebAuthn Device",
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      lastUsed: new Date()
    });

    return await this.credentialRepository.save(credentialEntity);
  }

  private async generateAuthenticationOptions(
    userId?: string
  ): Promise<AuthenticationOptions> {
    let allowCredentials: Array<{
      id: string;
      transports?: AuthenticatorTransportFuture[];
    }> = [];

    if (userId) {
      const credentials = await this.credentialRepository.find({
        where: { userId }
      });

      allowCredentials = credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined
      }));
    }

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: "preferred",
      rpID: this.getRpId()
    });

    return {
      challenge: options.challenge,
      options
    };
  }

  private async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    expectedChallenge: string
  ): Promise<boolean> {
    const credentialId = response.id;

    const credential = await this.credentialRepository.findOne({
      where: { userId, credentialId }
    });

    if (!credential) {
      return false;
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.getExpectedOrigin(),
      expectedRPID: this.getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter
      },
      requireUserVerification: false
    });

    if (verification.verified) {
      credential.counter = verification.authenticationInfo.newCounter;
      credential.lastUsed = new Date();
      await this.credentialRepository.save(credential);
      return true;
    }

    return false;
  }

  private getRpId(): string {
    const origin = this.getExpectedOrigin();
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      return "localhost";
    }
  }

  private getExpectedOrigin(): string {
    return this.rootConfig.server.publicAddress;
  }
}
