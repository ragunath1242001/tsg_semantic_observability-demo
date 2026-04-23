import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import {
  ABAC_ALL_METADATA_KEY,
  ABAC_METADATA_KEY,
  AbacRequirement
} from "@tsg-dsp/common-api";
import { PermissionString } from "@tsg-dsp/common-dtos";
import { Request } from "express";
import { decodeJwt } from "jose";

import { OauthUser } from "../model/user.dao.js";
import { getUser } from "../utils/session.js";
import { TokenService } from "./token.service.js";

export const DisableAuthGuard = Reflector.createDecorator<boolean>();

export const User = createParamDecorator(
  (_, context: ExecutionContext): OauthUser | undefined => {
    return getUser(context.switchToHttp().getRequest());
  }
);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService
  ) {}
  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const disabled =
      this.reflector.get(DisableAuthGuard, context.getHandler()) ||
      this.reflector.get(DisableAuthGuard, context.getClass());
    if (disabled) {
      return true;
    }

    // Try session auth first
    let user = getUser(request);

    // Fall back to Bearer token auth
    if (!user && request.headers.authorization?.startsWith("Bearer ")) {
      const token = request.headers.authorization.substring(7);
      try {
        const payload = await this.validateAccessToken(token);
        // Create an OauthUser-like object from the token payload
        user = Object.assign(new OauthUser(), {
          id: payload.sub,
          username: payload.azp ?? payload.sub,
          permissions: payload.permissions ?? []
        });
        // Also set req.user for the ABAC middleware
        (request as Request & { user?: unknown }).user = {
          sub: payload.sub,
          permissions: payload.permissions ?? []
        };
      } catch {
        this.logger.warn("Bearer token validation failed");
        throw new UnauthorizedException();
      }
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    // Check for ABAC requirements
    const requirements: AbacRequirement[] | undefined =
      this.reflector.get(ABAC_METADATA_KEY, context.getHandler()) ||
      this.reflector.get(ABAC_METADATA_KEY, context.getClass());

    const requiresAll: AbacRequirement[] | undefined = this.reflector.get(
      ABAC_ALL_METADATA_KEY,
      context.getHandler()
    );

    // If no requirements, allow access (authenticated only)
    if (!requirements && !requiresAll) {
      return true;
    }

    const userPermissions = user.permissions || [];

    // Helper to format requirements as permission strings
    const formatRequirements = (reqs: AbacRequirement[]) =>
      reqs.map(
        (r) => `${r.action}:${r.resource}${r.scope ? `:${r.scope}` : ""}`
      );

    // Check RequiresAll (all permissions required)
    if (requiresAll) {
      const hasAllPermissions = requiresAll.every((req) =>
        this.hasPermission(userPermissions, req)
      );
      if (!hasAllPermissions) {
        throw new ForbiddenException({
          message:
            "Insufficient permissions - all required permissions not met",
          required: formatRequirements(requiresAll),
          requiresAll: true,
          available: userPermissions
        });
      }
      return true;
    }

    // Check Requires/RequiresAny (at least one permission required)
    if (requirements) {
      const hasAnyPermission = requirements.some((req) =>
        this.hasPermission(userPermissions, req)
      );
      if (!hasAnyPermission) {
        throw new ForbiddenException({
          message:
            "Insufficient permissions - none of the required permissions met",
          required: formatRequirements(requirements),
          requiresAll: false,
          available: userPermissions
        });
      }
      return true;
    }

    return true;
  }

  private async validateAccessToken(
    token: string
  ): Promise<Record<string, unknown>> {
    await this.tokenService.validateToken(token, "access_token");
    return decodeJwt(token) as Record<string, unknown>;
  }

  private hasPermission(
    userPermissions: PermissionString[],
    requirement: AbacRequirement
  ): boolean {
    const { action, resource, scope } = requirement;

    // Build the permission string to check
    const permissionToCheck = scope
      ? `${action}:${resource}:${scope}`
      : `${action}:${resource}`;
    const managePermissionToCheck = scope
      ? `manage:${resource}:${scope}`
      : `manage:${resource}`;

    // Check exact match
    if (
      userPermissions.includes(permissionToCheck as PermissionString) ||
      userPermissions.includes(managePermissionToCheck as PermissionString)
    ) {
      return true;
    }

    // Check wildcard scope (action:resource:*)
    const wildcardPermission = `${action}:${resource}:*` as PermissionString;
    const wildcardManagePermission = `manage:${resource}:*` as PermissionString;
    if (
      userPermissions.includes(wildcardPermission) ||
      userPermissions.includes(wildcardManagePermission)
    ) {
      return true;
    }
    // Check action wildcard (action:resource without scope = all scopes)
    const actionResourcePermission =
      `${action}:${resource}` as PermissionString;
    const manageActionResourcePermission =
      `manage:${resource}` as PermissionString;
    if (
      !scope &&
      (userPermissions.includes(actionResourcePermission) ||
        userPermissions.includes(manageActionResourcePermission))
    ) {
      return true;
    }

    return false;
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: AuthGuard
    };
  }
}
