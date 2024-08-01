import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import jsonpath from "jsonpath";
import { config } from "../config.module.js";
import { AuthConfig } from "../config.js";
import { AppRole, ClientInfo } from "@tsg-dsp/wallet-dtos";

export const Roles = Reflector.createDecorator<string | string[]>();
export const DisableRolesGuard = Reflector.createDecorator<boolean>();

export const Client = createParamDecorator(
  (_, context: ExecutionContext): ClientInfo | undefined => {
    if (!config.auth.enabled) {
      return {
        sub: "0",
        name: "anonymous",
        email: "noreply@example.com",
        didId: `did:web:${config.server.publicDomain.replace(":", "%3A")}`,
        roles: [
          AppRole.VIEW_DID,
          AppRole.MANAGE_KEYS,
          AppRole.USE_KEYS,
          AppRole.VIEW_OWN_CREDENTIALS,
          AppRole.VIEW_ALL_CREDENTIALS,
          AppRole.MANAGE_OWN_CREDENTIALS,
          AppRole.MANAGE_ALL_CREDENTIALS,
          AppRole.ISSUE_CREDENTIALS,
          AppRole.VIEW_PRESENTATIONS,
        ],
      };
    }
    const request = context.switchToHttp().getRequest();
    if (!request.user) return undefined;
    return {
      sub: request.user.sub || "",
      name: request.user.name || "",
      email: request.user.email || "",
      didId: request.user.properties?.didId || "",
      roles: jsonpath
        .query(request.user, config.auth.rolePath)
        .filter((r) => Object.values(AppRole).includes(r)),
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
}
