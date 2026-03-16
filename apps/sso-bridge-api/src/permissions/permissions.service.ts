import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Permissions, PermissionString, Resource } from "@tsg-dsp/common-dtos";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { OauthClient } from "../model/client.dao.js";
import { OauthUser } from "../model/user.dao.js";

@Injectable()
export class PermissionsService {
  private readonly logger: Logger = new Logger(this.constructor.name);

  constructor(
    private readonly rootConfig: RootConfig,
    @InjectRepository(OauthUser)
    private readonly userRepository: Repository<OauthUser>,
    @InjectRepository(OauthClient)
    private readonly clientRepository: Repository<OauthClient>
  ) {}

  readonly appMapping: Record<string, string> = {
    CP: "Control Plane",
    DP: "Common Data Plane",
    ADP: "Analytics Data Plane",
    HDP: "HTTP Data Plane",
    W: "Wallet",
    SSO: "SSO Bridge"
  };

  /**
   * Get all available permissions from the system.
   */
  getAvailablePermissions(): { permission: string; description: string }[] {
    const allPermissions = Object.entries(Permissions).map(([key, value]) => {
      const [app, ...remainder] = key.split("_");
      const resource = remainder
        .slice(0, -1)
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(" ");
      const action = remainder.slice(-1)[0];
      return {
        permission: value,
        description: `${action[0]}${action.slice(1).toLowerCase()} permission for ${resource} resources of the ${this.appMapping[app] || app}`
      };
    });
    return allPermissions;
  }

  /**
   * Expand permissions to actual permissions.
   * Allows for expanding wildcard resource permissions.
   */
  expandPermissions(permissions: string[]): PermissionString[] {
    const expanded = new Set<string>();
    for (const item of permissions) {
      // It's a wildcard resource permission string
      const [action, resource, ...scope] = item.split(":");
      if (resource.includes("*")) {
        const regexp = new RegExp(`^${resource.replace(/\*/g, ".*")}$`);
        const expandedResources = Object.values(Resource).filter((res) =>
          regexp.test(res)
        );
        for (const res of expandedResources) {
          const expandedPerm = scope.length
            ? `${action}:${res}:${scope.join(":")}`
            : `${action}:${res}`;
          expanded.add(expandedPerm);
        }
      } else {
        // It's a direct permission string
        expanded.add(item);
      }
    }

    return Array.from(expanded) as PermissionString[];
  }

  /**
   * Get permissions for a user by ID.
   */
  async getUserPermissions(userId: string): Promise<PermissionString[]> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      return [];
    }
    return user.permissions;
  }

  /**
   * Get permissions for a client by client ID.
   */
  async getClientPermissions(clientId: string): Promise<PermissionString[]> {
    const client = await this.clientRepository.findOneBy({ clientId });
    if (!client) {
      return [];
    }
    return client.permissions;
  }
}
