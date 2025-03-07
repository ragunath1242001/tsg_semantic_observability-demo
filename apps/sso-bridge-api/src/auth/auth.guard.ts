import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { toArray } from "@tsg-dsp/common-api";
import { Request } from "express";

import { OauthUser } from "../model/user.dao.js";
import { getUser } from "../utils/session.js";

export const DisableAuthGuard = Reflector.createDecorator<boolean>();
export const ManagementRoles = Reflector.createDecorator<string | string[]>();

export const User = createParamDecorator(
  (_, context: ExecutionContext): OauthUser | undefined => {
    return getUser(context.switchToHttp().getRequest());
  }
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const disabled =
      this.reflector.get(DisableAuthGuard, context.getHandler()) ||
      this.reflector.get(DisableAuthGuard, context.getClass());
    if (disabled) {
      return true;
    }
    const user = getUser(request);
    if (user) {
      const allowedRoles =
        this.reflector.get(ManagementRoles, context.getHandler()) ||
        this.reflector.get(ManagementRoles, context.getClass());
      if (!allowedRoles) {
        return true;
      }
      return toArray(allowedRoles).some((role: string) =>
        user.roles.includes(role)
      );
    }
    throw new UnauthorizedException();
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: AuthGuard
    };
  }
}
