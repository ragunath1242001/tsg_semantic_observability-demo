import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import { Repository } from "typeorm";

import { RecoveryCode } from "../model/recovery-code.dao.js";
import { TotpCredential } from "../model/totp-credential.dao.js";
import { WebAuthnCredential } from "../model/webauthn-credential.dao.js";
import { AuthSession } from "../utils/session.js";

/**
 * Helper service to handle cross-cutting 2FA concerns without circular dependencies
 */
@Injectable()
export class TwoFactorHelper {
  constructor(
    @InjectRepository(TotpCredential)
    private readonly totpCredentialRepository: Repository<TotpCredential>,
    @InjectRepository(WebAuthnCredential)
    private readonly webAuthnCredentialRepository: Repository<WebAuthnCredential>,
    @InjectRepository(RecoveryCode)
    private readonly recoveryCodeRepository: Repository<RecoveryCode>
  ) {}

  async has2FACredentials(userId: number): Promise<boolean> {
    const hasTotpCredentials = await this.hasVerifiedTotpCredentials(userId);
    if (hasTotpCredentials) {
      return true;
    }
    const hasWebAuthnCredentials = await this.hasWebAuthnCredentials(userId);
    return hasWebAuthnCredentials;
  }

  async hasVerifiedTotpCredentials(userId: number): Promise<boolean> {
    const count = await this.totpCredentialRepository.count({
      where: { userId, isVerified: true }
    });
    return count > 0;
  }

  async hasWebAuthnCredentials(userId: number): Promise<boolean> {
    const count = await this.webAuthnCredentialRepository.count({
      where: { userId }
    });
    return count > 0;
  }

  async isInitial2FASetup(
    userId: number,
    credentialType: "totp" | "webauthn"
  ): Promise<boolean> {
    const totpCount = await this.getVerifiedTotpCredentialsCount(userId);
    const webAuthnCount = await this.getWebAuthnCredentialsCount(userId);

    return credentialType === "totp"
      ? totpCount === 1 && webAuthnCount === 0
      : webAuthnCount === 1 && totpCount === 0;
  }

  async deleteAll2FACredentials(userId: number): Promise<void> {
    await this.totpCredentialRepository.delete({ userId });
    await this.webAuthnCredentialRepository.delete({ userId });
    await this.recoveryCodeRepository.delete({ userId });
  }

  validatePending2FASetup(
    session: AuthSession | undefined,
    setupType: string,
    logger?: Logger
  ): void {
    if (!session?.pendingTwoFactor?.passwordVerified) {
      const error = new AppError(
        `No pending ${setupType} setup`,
        HttpStatus.BAD_REQUEST
      );
      if (logger) {
        error.andLog(logger);
      }
      throw error;
    }
  }

  private async getVerifiedTotpCredentialsCount(
    userId: number
  ): Promise<number> {
    return await this.totpCredentialRepository.count({
      where: { userId, isVerified: true }
    });
  }

  private async getWebAuthnCredentialsCount(userId: number): Promise<number> {
    return await this.webAuthnCredentialRepository.count({
      where: { userId }
    });
  }
}
