import { Injectable } from "@nestjs/common";
import {
  Action,
  EffectiveScope,
  isAllScope,
  isOwnScope,
  isSpecificScope,
  parsePermission,
  permissionAllowsResourceId,
  PermissionString,
  PolicyContext,
  PolicyResult,
  RESERVED_SCOPES
} from "@tsg-dsp/common-dtos";

import { OwnershipRegistry } from "./ownership.service.js";

@Injectable()
export class AbacPolicyService {
  async evaluate(
    context: PolicyContext,
    requiredScope?: string,
    ownershipRegistry?: OwnershipRegistry
  ): Promise<PolicyResult> {
    const { subject, action, resource } = context;

    for (const perm of subject.permissions) {
      const parsed = parsePermission(perm);

      if (parsed.resource !== resource.type) continue;

      if (!this.actionMatches(parsed.action, action)) continue;

      const scopeResult = await this.evaluateScope(
        parsed,
        perm,
        requiredScope,
        subject,
        resource,
        ownershipRegistry
      );

      if (scopeResult.allowed) {
        return scopeResult;
      }
    }

    return {
      allowed: false,
      reason: `No matching permission for ${action}:${resource.type}${requiredScope ? `:${requiredScope}` : ""}`
    };
  }

  private async evaluateScope(
    parsed: ReturnType<typeof parsePermission>,
    originalPerm: PermissionString,
    requiredScope: string | undefined,
    subject: PolicyContext["subject"],
    resource: PolicyContext["resource"],
    ownershipRegistry?: OwnershipRegistry
  ): Promise<PolicyResult> {
    let effectiveScope: EffectiveScope;
    let allowedResourceIds: string[] | undefined;

    if (isAllScope(parsed)) {
      effectiveScope = RESERVED_SCOPES.ALL;
    } else if (isOwnScope(parsed)) {
      effectiveScope = RESERVED_SCOPES.OWN;
    } else if (isSpecificScope(parsed)) {
      effectiveScope = "specific";
      allowedResourceIds = Array.isArray(parsed.scope)
        ? parsed.scope
        : [parsed.scope as string];
    } else {
      effectiveScope = RESERVED_SCOPES.ALL;
    }

    if (requiredScope) {
      if (
        requiredScope === RESERVED_SCOPES.ALL &&
        effectiveScope !== RESERVED_SCOPES.ALL
      ) {
        return { allowed: false, reason: "Requires wildcard (*) access" };
      }
      if (
        requiredScope === RESERVED_SCOPES.OWN &&
        effectiveScope !== RESERVED_SCOPES.OWN &&
        effectiveScope !== RESERVED_SCOPES.ALL
      ) {
        return { allowed: false, reason: "Requires ownership-based access" };
      }
    }

    if (effectiveScope === RESERVED_SCOPES.ALL) {
      return {
        allowed: true,
        matchedPermission: originalPerm,
        effectiveScope: RESERVED_SCOPES.ALL
      };
    }

    if (effectiveScope === "specific") {
      if (resource.id) {
        if (permissionAllowsResourceId(parsed, resource.id)) {
          return {
            allowed: true,
            matchedPermission: originalPerm,
            effectiveScope: "specific",
            allowedResourceIds
          };
        }
        return {
          allowed: false,
          reason: `Resource ${resource.id} not in allowed list`
        };
      }
      return {
        allowed: true,
        matchedPermission: originalPerm,
        effectiveScope: "specific",
        allowedResourceIds
      };
    }

    if (effectiveScope === RESERVED_SCOPES.OWN) {
      if (!resource.id) {
        return {
          allowed: true,
          matchedPermission: originalPerm,
          effectiveScope: RESERVED_SCOPES.OWN
        };
      }

      const isOwner = await this.checkOwnership(
        subject,
        resource,
        ownershipRegistry
      );

      if (isOwner) {
        return {
          allowed: true,
          matchedPermission: originalPerm,
          effectiveScope: RESERVED_SCOPES.OWN
        };
      }

      return { allowed: false, reason: "Not owner of resource" };
    }

    return { allowed: false, reason: "Unknown scope" };
  }

  private actionMatches(permAction: Action, requestedAction: Action): boolean {
    if (permAction === requestedAction) return true;
    if (permAction === Action.MANAGE) {
      return [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.EXECUTE
      ].includes(requestedAction);
    }
    return false;
  }

  private async checkOwnership(
    subject: PolicyContext["subject"],
    resource: PolicyContext["resource"],
    ownershipRegistry?: OwnershipRegistry
  ): Promise<boolean> {
    if (ownershipRegistry && resource.id) {
      return ownershipRegistry.isOwner(resource.type, resource.id, subject);
    }

    if (resource.ownerId && resource.ownerId === subject.sub) {
      return true;
    }

    if (resource.ownerIdentifier) {
      if (subject.didId && resource.ownerIdentifier === subject.didId) {
        return true;
      }
    }

    return false;
  }
}
