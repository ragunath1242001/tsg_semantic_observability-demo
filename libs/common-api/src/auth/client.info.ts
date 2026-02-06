import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Action,
  isAllScope,
  isOwnScope,
  isSpecificScope,
  parsePermission,
  PermissionString,
  Resource
} from "@tsg-dsp/common-dtos";
import { IsArray, IsEmail, IsOptional, IsString } from "class-validator";

export type EffectiveScope = "*" | "own" | "specific" | null;

export class ClientInfo {
  @ApiProperty({ example: "user-id-123" })
  @IsString()
  sub!: string;

  @ApiProperty({ example: "John Doe" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "did:example:123456789" })
  @IsString()
  @IsOptional()
  didId?: string;

  @ApiProperty({
    type: [String],
    example: ["read:credential:own", "manage:key"],
    description: "ABAC permissions"
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: PermissionString[];

  @ApiPropertyOptional({ example: "refresh-token-abc123" })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  hasPermission(permission: PermissionString): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: PermissionString[]): boolean {
    return permissions.some((p) => this.permissions.includes(p));
  }

  getEffectiveScope(action: Action, resource: Resource): EffectiveScope {
    let effectiveScope: EffectiveScope = null;

    for (const perm of this.permissions) {
      const parsed = parsePermission(perm);
      if (parsed.resource !== resource) continue;

      const actionMatches =
        parsed.action === action ||
        (parsed.action === Action.MANAGE &&
          [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE].includes(
            action
          ));
      if (!actionMatches) continue;

      if (isAllScope(parsed)) {
        return "*";
      }

      if (isSpecificScope(parsed) && effectiveScope !== "specific") {
        effectiveScope = "specific";
      }

      if (isOwnScope(parsed) && !effectiveScope) {
        effectiveScope = "own";
      }
    }

    return effectiveScope;
  }

  getSpecificResourceIds(action: Action, resource: Resource): string[] {
    const ids: string[] = [];

    for (const perm of this.permissions) {
      const parsed = parsePermission(perm);
      if (parsed.resource !== resource) continue;
      if (!isSpecificScope(parsed)) continue;

      const actionMatches =
        parsed.action === action ||
        (parsed.action === Action.MANAGE &&
          [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE].includes(
            action
          ));
      if (!actionMatches) continue;

      if (Array.isArray(parsed.scope)) {
        ids.push(...parsed.scope);
      } else if (typeof parsed.scope === "string") {
        ids.push(parsed.scope);
      }
    }

    return [...new Set(ids)];
  }

  getOwnershipFields(): OwnershipFields {
    return {
      ownerId: this.sub,
      ownerIdentifier: this.didId,
      createdBy: this.sub
    };
  }
}

export interface OwnershipFields {
  ownerId?: string;
  ownerIdentifier?: string;
  createdBy?: string;
  tenantId?: string;
}

export function getOwnershipFieldsFromClient(
  client?: ClientInfo
): OwnershipFields {
  if (!client) return {};
  return client.getOwnershipFields();
}

export class AuthenticatedUser {
  @ApiProperty({ example: "authenticated" })
  state = "authenticated" as const;

  @ApiProperty({
    example: {
      sub: "user-id-123",
      name: "John Doe",
      email: "john.doe@example.com",
      permissions: ["read:credential:own", "manage:key"],
      didId: "did:example:123456789",
      refreshToken: "refresh-token-abc123"
    }
  })
  user!: ClientInfo;
}

export class UnauthenticatedUser {
  @ApiProperty({ example: "unauthenticated" })
  state = "unauthenticated" as const;
}
