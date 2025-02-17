import { Session, SessionData } from "express-session";
import { Request } from "express";

export type AuthSession = Session & Partial<SessionData> & { user?: any };

export function getSession(request: Request): AuthSession | undefined {
  return request.session as AuthSession | undefined;
}
