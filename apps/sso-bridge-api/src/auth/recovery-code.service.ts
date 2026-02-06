import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import * as bcrypt from "bcrypt";
import { Request } from "express";
import { Repository } from "typeorm";

import { RecoveryCode } from "../model/recovery-code.dao.js";
import { UsersService } from "../users/users.service.js";
import { getSession, requireAuthenticatedUser } from "../utils/session.js";
import { oauthUserToDto } from "../utils/user.js";
import { TwoFactorHelper } from "./two-factor.helper.js";

@Injectable()
export class RecoveryCodeService {
  private static readonly RECOVERY_CODE_COUNT = 10;
  private static readonly RECOVERY_CODE_LENGTH = 8;

  constructor(
    @InjectRepository(RecoveryCode)
    private readonly recoveryCodeRepository: Repository<RecoveryCode>,
    private readonly usersService: UsersService,
    private readonly twoFactorHelper: TwoFactorHelper
  ) {}
  private readonly logger: Logger = new Logger(this.constructor.name);

  async verifyAndUseRecoveryCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    const recoveryCodes = await this.recoveryCodeRepository.find({
      where: { userId, used: false }
    });

    for (const recoveryCode of recoveryCodes) {
      // eslint-disable-next-line no-await-in-loop
      const isMatch = await bcrypt.compare(code, recoveryCode.codeHash);

      if (isMatch) {
        recoveryCode.used = true;
        recoveryCode.usedAt = new Date();
        // eslint-disable-next-line no-await-in-loop
        await this.recoveryCodeRepository.save(recoveryCode);
        return true;
      }
    }

    return false;
  }

  async getRecoveryCodesStatus(request: Request) {
    const user = requireAuthenticatedUser(request, this.logger);

    const remainingCount = await this.getRemainingCodesCount(user.id);

    return { remainingCount };
  }

  async getRemainingCodesCount(userId: string): Promise<number> {
    return await this.recoveryCodeRepository.count({
      where: { userId, used: false }
    });
  }

  async generateRecoveryCodesForInitial2FASetup(
    userId: string,
    credentialType: "totp" | "webauthn"
  ): Promise<{ recoveryCodes: string[]; message: string } | undefined> {
    const isInitialSetup = await this.twoFactorHelper.isInitial2FASetup(
      userId,
      credentialType
    );

    if (!isInitialSetup) {
      return undefined;
    }

    try {
      const recoveryCodes = await this.generateRecoveryCodes(userId);

      this.logger.log(
        `Generated recovery codes for user ${userId} during initial ${credentialType} setup`
      );

      return {
        recoveryCodes,
        message:
          "Save these recovery codes in a safe place. You can use them to regain access to your account if you lose your two-factor authentication device."
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate recovery codes for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  async regenerateRecoveryCodes(request: Request) {
    const user = requireAuthenticatedUser(request, this.logger);

    const has2FA = await this.twoFactorHelper.has2FACredentials(user.id);

    if (!has2FA) {
      throw new AppError("2FA not enabled", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const recoveryCodes = await this.generateRecoveryCodes(user.id);

    return {
      recoveryCodes,
      message:
        "Save these recovery codes in a safe place. Each code can only be used once."
    };
  }

  async acknowledgeRecoveryCodes(request: Request) {
    const session = getSession(request);

    if (!session?.pendingTwoFactor?.userId) {
      throw new AppError("No pending session", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }

    const user = await this.usersService.getUser(
      session.pendingTwoFactor.userId
    );

    session.user = user;
    session.pendingTwoFactor = undefined;

    return oauthUserToDto(user);
  }

  private async generateRecoveryCodes(userId: string): Promise<string[]> {
    await this.recoveryCodeRepository.delete({ userId, used: false });

    const codes: string[] = [];
    const hashPromises: Promise<string>[] = [];

    for (let i = 0; i < RecoveryCodeService.RECOVERY_CODE_COUNT; i++) {
      const code = this.generateRandomCode();
      codes.push(code);
      hashPromises.push(bcrypt.hash(code, 10));
    }

    const hashes = await Promise.all(hashPromises);
    const entities: RecoveryCode[] = hashes.map((hash) =>
      this.recoveryCodeRepository.create({
        userId,
        codeHash: hash,
        used: false
      })
    );

    await this.recoveryCodeRepository.save(entities);

    return codes;
  }

  private generateRandomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < RecoveryCodeService.RECOVERY_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];

      if (
        (i + 1) % 4 === 0 &&
        i < RecoveryCodeService.RECOVERY_CODE_LENGTH - 1
      ) {
        code += "-";
      }
    }

    return code;
  }
}
