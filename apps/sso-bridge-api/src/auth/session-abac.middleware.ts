import { Injectable, NestMiddleware } from "@nestjs/common";
import { PermissionString } from "@tsg-dsp/common-dtos";
import { NextFunction, Request, Response } from "express";

import { OauthUser } from "../model/user.dao.js";
import { getUser } from "../utils/session.js";

interface AbacUser {
  sub: string;
  email?: string;
  permissions?: PermissionString[];
}

@Injectable()
export class SessionAbacMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const sessionUser = getUser(req);

    if (sessionUser) {
      (req as Request & { user?: AbacUser }).user =
        this.mapSessionUserToAbacSubject(sessionUser);
    }

    next();
  }

  private mapSessionUserToAbacSubject(user: OauthUser): AbacUser {
    return {
      sub: `user:${user.id}`,
      email: user.email,
      permissions: user.permissions || []
    };
  }
}
