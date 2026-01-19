import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AppError } from "@tsg-dsp/common-api";
import { Request } from "express";

import { OauthUser } from "../model/user.dao.js";
import { UsersService } from "../users/users.service.js";
import { AuthSession, getSession } from "../utils/session.js";
import { oauthUserToDto } from "../utils/user.js";
import { RecoveryCodeService } from "./recovery-code.service.js";
import { TotpService } from "./totp.service.js";
import { TwoFactorHelper } from "./two-factor.helper.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly totpService: TotpService,
    private readonly recoveryCodeService: RecoveryCodeService,
    private readonly twoFactorHelper: TwoFactorHelper
  ) {}
  private readonly logger: Logger = new Logger(this.constructor.name);

  async login(username: string, password: string, request: Request) {
    const user = await this.usersService.validateUser(username, password);
    const session = getSession(request);

    if (!user.require2FA) {
      if (session) {
        session.user = user;
      }
      return oauthUserToDto(user);
    }

    if (session) {
      session.pendingTwoFactor = {
        userId: user.id,
        username: user.username,
        passwordVerified: true
      };
    }

    const hasTotpCredentials =
      await this.twoFactorHelper.hasVerifiedTotpCredentials(user.id);
    const hasWebAuthnCredentials =
      await this.twoFactorHelper.hasWebAuthnCredentials(user.id);

    if (!hasTotpCredentials && !hasWebAuthnCredentials) {
      return {
        status: "2fa_setup_required" as const,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    }

    return {
      status: "2fa_required" as const,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      hasTotpCredentials,
      hasWebAuthnCredentials
    };
  }

  async verify2FA(token: string, request: Request) {
    const session = getSession(request);
    this.twoFactorHelper.validatePending2FASetup(
      session,
      "2FA verification",
      this.logger
    );

    const user = await this.getUserFromPendingSession(session!);

    // Try TOTP verification
    const isValidTotp = await this.totpService.verifyAnyCredential(
      user.id,
      token
    );

    if (isValidTotp) {
      this.completeLoginSession(session!, user);
      return oauthUserToDto(user);
    }

    // Try recovery code
    const isValidRecoveryCode =
      await this.recoveryCodeService.verifyAndUseRecoveryCode(user.id, token);

    if (isValidRecoveryCode) {
      this.completeLoginSession(session!, user);

      const remainingCodes =
        await this.recoveryCodeService.getRemainingCodesCount(user.id);

      return {
        ...oauthUserToDto(user),
        warning:
          remainingCodes === 0
            ? "Last recovery code"
            : `Remaining recovery codes: ${remainingCodes}`
      };
    }

    throw new AppError(
      "Invalid 2FA or recovery code",
      HttpStatus.BAD_REQUEST
    ).andLog(this.logger);
  }

  async logout(request: Request) {
    const session = getSession(request);
    if (session) {
      session.user = undefined;
      session.pendingTwoFactor = undefined;
    }
  }

  private async getUserFromPendingSession(
    session: AuthSession
  ): Promise<OauthUser> {
    if (!session.pendingTwoFactor?.userId) {
      throw new AppError("No pending session", HttpStatus.BAD_REQUEST).andLog(
        this.logger
      );
    }
    return await this.usersService.getUser(session.pendingTwoFactor.userId);
  }

  private completeLoginSession(session: AuthSession, user: OauthUser): void {
    session.user = user;
    session.pendingTwoFactor = undefined;
  }
}
