import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import jsonpath from "jsonpath";
import { GenericConfigModule } from "../config/config.module.js";
import { AuthConfig } from "../config/auth.js";
import { ServerConfig } from "../config/server.js";
import { ClientInfo } from "./client.info.js";
import { plainToInstance } from "class-transformer";

export const Roles = Reflector.createDecorator<string | string[]>();
export const DisableRolesGuard = Reflector.createDecorator<boolean>();

export const Client = createParamDecorator(
  (_, context: ExecutionContext): ClientInfo | undefined => {
    const authConfig = GenericConfigModule.get(AuthConfig);
    const serverConfig = GenericConfigModule.get(ServerConfig);
    if (!authConfig.enabled) {
      return {
        sub: "0",
        name: "anonymous",
        email: "noreply@example.com",
        didId: "did:web:" + serverConfig.publicDomain.replace(":", "%3A"),
        roles: [
          "wallet_view_did",
          "wallet_manage_keys",
          "wallet_use_keys",
          "wallet_view_own_credentials",
          "wallet_view_all_credentials",
          "wallet_manage_own_credentials",
          "wallet_manage_all_credentials",
          "wallet_issue_credentials",
          "wallet_view_presentations",
          "wallet_manage_clients",
          "controlplane_admin",
          "controlplane_dataplane"
        ]
      };
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user || request.session?.user;
    if (!user) return undefined;
    return plainToInstance(ClientInfo, {
      sub: user.sub || "",
      name: user.username || "",
      email: user.email || "",
      didId: user.properties?.didId || "",
      roles: jsonpath.query(user, authConfig.rolePath)
    });
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
    const roles = jsonpath.query(
      request.user,
      GenericConfigModule.get(AuthConfig).rolePath
    );
    return [allowedRoles].flat().some((r: string) => roles.includes(r));
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: RolesGuard
    };
  }
}
