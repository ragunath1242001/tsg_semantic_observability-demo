import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { PermissionString, Resource } from "@tsg-dsp/common-dtos";
import { plainToInstance } from "class-transformer";
import jsonpath from "jsonpath";

import { AuthConfig } from "../config/auth.js";
import { GenericConfigModule } from "../config/config.module.js";
import { ServerConfig } from "../config/server.js";
import { ClientInfo } from "./client.info.js";

export const Client = createParamDecorator(
  (_, context: ExecutionContext): ClientInfo | undefined => {
    const authConfig = GenericConfigModule.get(AuthConfig);
    const serverConfig = GenericConfigModule.get(ServerConfig);
    if (!authConfig.enabled) {
      return plainToInstance(ClientInfo, {
        sub: "0",
        name: "anonymous",
        email: "noreply@example.com",
        didId: "did:web:" + serverConfig.publicDomain.replace(":", "%3A"),
        permissions: Object.values(Resource).flatMap(
          (r) => "manage:" + r
        ) as PermissionString[]
      });
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user || request.session?.user;
    if (!user) return undefined;

    const permissionPath = authConfig.permissionPath || "permissions";
    let permissions: PermissionString[] = [];
    try {
      permissions = jsonpath.query(user, permissionPath) as PermissionString[];
      if (permissions.length === 1 && Array.isArray(permissions[0])) {
        permissions = permissions[0] as PermissionString[];
      }
    } catch {
      permissions = user.permissions || [];
    }

    return plainToInstance(ClientInfo, {
      sub: user.sub || "",
      name: user.username || "",
      email: user.email || "",
      didId: user.properties?.didId || "",
      permissions
    });
  }
);
