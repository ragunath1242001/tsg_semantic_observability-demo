import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import {
  Action,
  AuditSeverity,
  PermissionString,
  PolicyResult,
  RequestActor,
  RequestContext,
  SubjectAttributes
} from "@tsg-dsp/common-dtos";
import { Request } from "express";

import { AuthConfig } from "../../config/auth.js";
import { getSession } from "../../utils/session.js";
import {
  ABAC_ALL_METADATA_KEY,
  ABAC_METADATA_KEY,
  ABAC_RESOURCE_ID_PARAM_KEY,
  AbacRequirement
} from "./abac.decorator.js";
import { AbacPolicyService } from "./abac.policy.service.js";
import { AuditLogService } from "./audit.log.service.js";
import { DELEGATION_HEADERS } from "./delegation.constants.js";
import { OwnershipRegistry } from "./ownership.service.js";

@Injectable()
export class AbacGuard implements CanActivate {
  private readonly logger = new Logger(AbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authConfig: AuthConfig,
    private readonly policyService: AbacPolicyService,
    private readonly ownershipRegistry: OwnershipRegistry,
    private readonly auditLogService: AuditLogService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.authConfig.enabled) {
      return true;
    }

    const disabled =
      this.reflector.get<boolean>("abac:disabled", context.getHandler()) ||
      this.reflector.get<boolean>("abac:disabled", context.getClass());
    if (disabled) {
      return true;
    }

    const requirementsAny =
      this.reflector.get<AbacRequirement[]>(
        ABAC_METADATA_KEY,
        context.getHandler()
      ) ||
      this.reflector.get<AbacRequirement[]>(
        ABAC_METADATA_KEY,
        context.getClass()
      );

    const requirementsAll =
      this.reflector.get<AbacRequirement[]>(
        ABAC_ALL_METADATA_KEY,
        context.getHandler()
      ) ||
      this.reflector.get<AbacRequirement[]>(
        ABAC_ALL_METADATA_KEY,
        context.getClass()
      );

    if (!requirementsAny && !requirementsAll) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const requestContext = this.extractRequestContext(request);

    const permissionsToEvaluate = requestContext.isOnBehalfOf
      ? requestContext.delegation!.effectivePermissions
      : requestContext.caller.permissions || [];

    const subject: SubjectAttributes = {
      ...requestContext.caller,
      permissions: permissionsToEvaluate
    };

    const resourceIdParam = this.reflector.get<string>(
      ABAC_RESOURCE_ID_PARAM_KEY,
      context.getHandler()
    );
    const resourceId = resourceIdParam
      ? request.params[resourceIdParam]
      : undefined;

    let result: PolicyResult;

    if (requirementsAll) {
      const results = await Promise.all(
        requirementsAll.map((req) =>
          this.evaluateRequirement(req, subject, request, resourceId)
        )
      );
      const allAllowed = results.every((r) => r.allowed);
      if (!allAllowed) {
        const deniedReasons = results
          .filter((r) => !r.allowed)
          .map((r) => r.reason);
        result = { allowed: false, reason: deniedReasons.join(", ") };
      } else {
        result = { allowed: true };
      }
    } else if (requirementsAny) {
      const results = await Promise.all(
        requirementsAny.map((req) =>
          this.evaluateRequirement(req, subject, request, resourceId)
        )
      );
      const allowedResult = results.find((r) => r.allowed);
      if (!allowedResult) {
        result = {
          allowed: false,
          reason: `No matching permission for ${JSON.stringify(requirementsAny)}`
        };
      } else {
        result = allowedResult;
      }
    } else {
      result = { allowed: true };
    }

    await this.auditLogService.log({
      caller: requestContext.caller,
      onBehalfOf: requestContext.delegation?.originalActor,
      delegationChain: requestContext.delegation?.delegationChain.map(
        (a) => a.serviceName || a.sub
      ),
      correlationId: requestContext.delegation?.correlationId,
      action:
        requirementsAny?.[0]?.action ||
        requirementsAll?.[0]?.action ||
        Action.READ,
      resource: {
        type: requirementsAny?.[0]?.resource || requirementsAll?.[0]?.resource,
        id: resourceId
      },
      environment: requestContext.environment,
      result,
      severity: result.allowed ? AuditSeverity.INFO : AuditSeverity.WARNING
    });

    if (!result.allowed) {
      const requiredPermissions = [
        ...(requirementsAny?.map(
          (r) => `${r.action}:${r.resource}${r.scope ? `:${r.scope}` : ""}`
        ) || []),
        ...(requirementsAll?.map(
          (r) => `${r.action}:${r.resource}${r.scope ? `:${r.scope}` : ""}`
        ) || [])
      ];
      const availablePermissions = subject.permissions || [];

      this.logger.warn(
        `ABAC denied for ${subject.sub}${requestContext.isOnBehalfOf ? ` (on behalf of ${requestContext.delegation?.originalActor.sub})` : ""}: ${result.reason}`
      );
      this.logger.debug(
        `Required permissions: ${JSON.stringify(requiredPermissions)}, Available: ${JSON.stringify(availablePermissions)}`
      );

      throw new ForbiddenException({
        message: "Insufficient permissions",
        reason: result.reason,
        required: requiredPermissions,
        requiresAll: !!requirementsAll,
        available: availablePermissions
      });
    }

    (request as any).requestContext = requestContext;
    (request as any).abacScope = result.effectiveScope;
    (request as any).allowedResourceIds = result.allowedResourceIds;

    return true;
  }

  private extractRequestContext(request: Request): RequestContext {
    let user = (request as any).user;
    if (!user) {
      const session = getSession(request);
      user = session?.user || {};
    }
    const environment = {
      timestamp: new Date(),
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      requestPath: request.path,
      requestMethod: request.method,
      correlationId: request.headers[
        DELEGATION_HEADERS.CORRELATION_ID.toLowerCase()
      ] as string
    };

    const originalActorHeader = request.headers[
      DELEGATION_HEADERS.ORIGINAL_ACTOR.toLowerCase()
    ] as string;

    if (originalActorHeader) {
      const originalActor: RequestActor = JSON.parse(originalActorHeader);
      const delegationChain: RequestActor[] = JSON.parse(
        (request.headers[
          DELEGATION_HEADERS.DELEGATION_CHAIN.toLowerCase()
        ] as string) || "[]"
      );
      const effectivePermissions = (
        (request.headers[
          DELEGATION_HEADERS.EFFECTIVE_PERMISSIONS.toLowerCase()
        ] as string) || ""
      )
        .split(",")
        .filter(Boolean) as PermissionString[];

      return {
        caller: {
          sub: user.sub,
          type: "service",
          serviceName: user.clientId || user.azp,
          permissions: user.permissions || []
        },
        delegation: {
          originalActor,
          delegationChain,
          correlationId: request.headers[
            DELEGATION_HEADERS.CORRELATION_ID.toLowerCase()
          ] as string,
          originTimestamp: new Date(
            request.headers[
              DELEGATION_HEADERS.ORIGIN_TIMESTAMP.toLowerCase()
            ] as string
          ),
          effectivePermissions
        },
        isOnBehalfOf: true,
        environment
      };
    }

    return {
      caller: {
        sub: user.sub || "",
        type: user.clientId ? "service" : "user",
        serviceName: user.clientId,
        permissions: user.permissions || [],
        didId: user.properties?.didId || user.didId,
        email: user.email
      },
      isOnBehalfOf: false,
      environment
    };
  }

  private async evaluateRequirement(
    requirement: AbacRequirement,
    subject: SubjectAttributes,
    request: Request,
    resourceId?: string
  ): Promise<PolicyResult> {
    let resourceAttrs = await this.ownershipRegistry.getResourceAttributes(
      requirement.resource,
      resourceId || ""
    );

    if (!resourceAttrs) {
      resourceAttrs = { type: requirement.resource, id: resourceId };
    }

    return this.policyService.evaluate(
      {
        subject,
        action: requirement.action,
        resource: resourceAttrs,
        environment: {
          timestamp: new Date(),
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
          requestPath: request.path,
          requestMethod: request.method
        }
      },
      requirement.scope,
      this.ownershipRegistry
    );
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: AbacGuard
    };
  }
}
