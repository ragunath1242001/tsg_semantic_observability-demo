import { HttpStatus } from "@nestjs/common/enums/index.js";
import { Logger } from "@nestjs/common/services/index.js";
import { AppError } from "@tsg-dsp/common-api";
import { plainToInstance } from "class-transformer";
import { Request } from "express";
import { Session, SessionData } from "express-session";

import { OauthUser } from "../model/user.dao.js";

export type AuthSession = Session &
  Partial<SessionData> & {
    user?: OauthUser;
    pendingTwoFactor?: {
      userId: string;
      username: string;
      passwordVerified: boolean;
    };
    webAuthnChallenge?: string;
    webAuthnRegistration?: {
      userId: string;
      challenge: string;
    };
    totpRegistration?: {
      userId: string;
      credentialId: string;
      secret: string;
    };
  };

export function getSession(request: Request): AuthSession | undefined {
  return request.session as AuthSession | undefined;
}

export function getUser(request: Request): OauthUser | undefined {
  const session = request.session as AuthSession | undefined;
  if (session?.user) {
    return plainToInstance(OauthUser, session.user);
  }
  return undefined;
}

export function requireAuthenticatedUser(
  request: Request,
  logger?: Logger
): OauthUser {
  const user = getUser(request);
  if (!user) {
    const error = new AppError("Not authenticated", HttpStatus.UNAUTHORIZED);
    if (logger) {
      error.andLog(logger);
    }
    throw error;
  }
  return user;
}

export function getUserIdentity(
  request: Request,
  logger?: Logger
): { userId: string; username: string } {
  const user = getUser(request);
  const session = getSession(request);

  let userId: string;
  let username: string;

  if (user) {
    userId = user.id;
    username = user.username;
  } else if (session?.pendingTwoFactor) {
    userId = session.pendingTwoFactor.userId;
    username = session.pendingTwoFactor.username;
  } else {
    const error = new AppError("Not authenticated", HttpStatus.UNAUTHORIZED);
    if (logger) {
      error.andLog(logger);
    }
    throw error;
  }

  return { userId, username };
}
