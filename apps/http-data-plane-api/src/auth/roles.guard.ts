import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import jsonpath from "jsonpath";
import { config } from "../config.module";
import { AuthConfig } from "../config";

export const Roles = Reflector.createDecorator<string | string[]>();
export const DisableRolesGuard = Reflector.createDecorator<boolean>();

export interface ClientInfo {
  sub: string;
  name: string;
  email: string;
  roles: string[];
}

export const Client = createParamDecorator(
  (_, context: ExecutionContext): ClientInfo | undefined => {
    if (!config.auth.enabled) {
      return {
        sub: "0",
        name: "anonymous",
        email: "noreply@example.com",
        roles: []
      };
    }
    const request = context.switchToHttp().getRequest();
    if (!request.user) return undefined;
    return {
      sub: request.user.sub || "",
      name: request.user.name || "",
      email: request.user.email || "",
      roles: jsonpath.query(request.user, config.auth.rolePath)
    };
  }
);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authConfig: AuthConfig
  ) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.authConfig.enabled) {
      return true;
    }
    const disabled =
      this.reflector.get(DisableRolesGuard, context.getHandler()) ||
      this.reflector.get(DisableRolesGuard, context.getClass());
    if (disabled) {
      return true;
    }

    const allowedRoles =
      this.reflector.get(Roles, context.getHandler()) ||
      this.reflector.get(Roles, context.getClass());

    if (!allowedRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roles = jsonpath.query(request.user, config.auth.rolePath);
    return [allowedRoles].flat().some((r: string) => roles.includes(r));
  }
  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: RolesGuard
    };
  }
}
