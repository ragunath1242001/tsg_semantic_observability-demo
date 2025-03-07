import { Request } from "express";
import { Session, SessionData } from "express-session";

export type AuthSession = Session & Partial<SessionData> & { user?: any };

export function getSession(request: Request): AuthSession | undefined {
  return request.session as AuthSession | undefined;
}
