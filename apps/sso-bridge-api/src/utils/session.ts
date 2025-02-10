import { Session, SessionData } from "express-session";
import { Request } from "express";
import { OauthUser } from "../model/user.dao.js";
import { plainToInstance } from "class-transformer";

export type AuthSession = Session & Partial<SessionData> & { user?: OauthUser };

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
