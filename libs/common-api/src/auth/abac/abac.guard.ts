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
  Resource,
  SubjectAttributes
} from "@tsg-dsp/common-dtos";
import { Request } from "express";

import { AuditLogService } from "../../audit/audit.log.service.js";
import { AuthConfig } from "../../config/auth.js";
import { getSession } from "../../utils/session.js";
import { AuthenticatedActorSource, toRequestActor } from "../request-actor.js";
import {
  ABAC_ALL_METADATA_KEY,
  ABAC_METADATA_KEY,
  ABAC_RESOURCE_ID_PARAM_KEY,
  AbacRequirement
} from "./abac.decorator.js";
import { AbacPolicyService } from "./abac.policy.service.js";
import { DELEGATION_HEADERS } from "./delegation.constants.js";
import { OwnershipRegistry } from "./ownership.service.js";

type AuthenticatedRequest = Request & {
  user?: AuthenticatedActorSource;
  requestContext?: RequestContext;
  abacScope?: PolicyResult["effectiveScope"];
  allowedResourceIds?: string[];
};

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

    const request: AuthenticatedRequest = context.switchToHttp().getRequest();
    const requestContext = this.extractRequestContext(request);

    const permissionsToEvaluate = requestContext.isOnBehalfOf
      ? requestContext.delegation!.effectivePermissions
      : requestContext.caller.permissions || [];

    const subject: SubjectAttributes = {
      ...requestContext.caller,
      permissions: permissionsToEvaluate
    };

    const primaryAction =
      requirementsAny?.[0]?.action ||
      requirementsAll?.[0]?.action ||
      Action.READ;
    const primaryResource =
      requirementsAny?.[0]?.resource || requirementsAll?.[0]?.resource;

    const resourceIdParam = this.reflector.get<string>(
      ABAC_RESOURCE_ID_PARAM_KEY,
      context.getHandler()
    );
    const resourceId = this.extractResourceId(
      request,
      resourceIdParam,
      primaryResource
    );

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
      action: primaryAction,
      resource: {
        type: primaryResource,
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

    request.requestContext = requestContext;
    request.abacScope = result.effectiveScope;
    request.allowedResourceIds = result.allowedResourceIds;

    return true;
  }

  private extractRequestContext(request: AuthenticatedRequest): RequestContext {
    let user = request.user;
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
        ...toRequestActor(user),
        permissions: user.permissions || []
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

  private extractResourceId(
    request: Request,
    explicitName?: string,
    resourceType?: Resource
  ): string | undefined {
    if (explicitName) {
      return (
        this.toStringValue(request.params[explicitName]) ||
        this.toStringValue(
          (request.query as Record<string, unknown>)[explicitName]
        ) ||
        this.toStringValue(
          (request.body as Record<string, unknown> | undefined)?.[explicitName]
        )
      );
    }

    const paramCandidates = this.collectStringCandidates(
      request.params as Record<string, unknown>
    );
    const queryCandidates = this.collectStringCandidates(
      request.query as Record<string, unknown>
    );
    const allCandidates = [...paramCandidates, ...queryCandidates];

    for (const preferredKey of this.getPreferredResourceIdKeys(resourceType)) {
      const preferredMatch = allCandidates.find(
        ({ key }) => key === preferredKey
      );
      if (preferredMatch) {
        return preferredMatch.value;
      }
    }

    const idLikeParamCandidates = paramCandidates.filter(({ key }) =>
      this.isIdLikeKey(key)
    );
    if (idLikeParamCandidates.length === 1) {
      return idLikeParamCandidates[0].value;
    }

    const idLikeCandidates = allCandidates.filter(({ key }) =>
      this.isIdLikeKey(key)
    );
    if (idLikeCandidates.length === 1) {
      return idLikeCandidates[0].value;
    }

    if (idLikeParamCandidates.length > 1) {
      return idLikeParamCandidates[idLikeParamCandidates.length - 1].value;
    }

    if (allCandidates.length === 1) {
      return allCandidates[0].value;
    }

    return undefined;
  }

  private collectStringCandidates(source: Record<string, unknown>): Array<{
    key: string;
    value: string;
  }> {
    return Object.entries(source)
      .map(([key, value]) => ({ key, value: this.toStringValue(value) }))
      .filter(
        (candidate): candidate is { key: string; value: string } =>
          !!candidate.value
      );
  }

  private toStringValue(value: unknown): string | undefined {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      const firstString = value.find((item) => typeof item === "string");
      return typeof firstString === "string" ? firstString : undefined;
    }

    return undefined;
  }

  private isIdLikeKey(key: string): boolean {
    return key === "id" || key.endsWith("Id") || key === "scid";
  }

  private getPreferredResourceIdKeys(resourceType?: Resource): string[] {
    switch (resourceType) {
      case Resource.CP_DATASET:
        return ["datasetId", "id"];
      case Resource.CP_DATAPLANE:
        return ["id", "participantId"];
      case Resource.CP_NEGOTIATION:
        return ["processId", "datasetId", "dataSet", "id"];
      case Resource.CP_TRANSFER:
      case Resource.DP_TRANSFER:
        return ["processId", "agreementId", "id"];
      case Resource.CP_AGREEMENT:
        return ["agreementId", "id"];
      case Resource.CP_POLICY:
        return ["id", "transferId", "agreementId"];
      case Resource.CP_REGISTRY:
        return ["participantId", "id"];
      case Resource.ADP_ALGORITHM:
        return ["algorithmInstanceId", "transferId", "id"];
      case Resource.ADP_PROJECT_AGREEMENT:
        return ["id", "datasetId"];
      case Resource.ADP_ORCHESTRATION:
        return ["algorithmInstanceId", "jobName", "podName"];
      case Resource.ADP_FILE:
        return ["id"];
      case Resource.ADP_DATAPLANE:
      case Resource.HDP_DATAPLANE:
        return ["datasetId", "participantId", "id"];
      case Resource.W_CREDENTIAL:
        return ["credentialId", "requestId", "id"];
      case Resource.W_PRESENTATION:
        return ["requestId", "id"];
      case Resource.W_KEY:
        return ["keyId", "id"];
      case Resource.W_DID:
        return ["id", "scid"];
      case Resource.W_ISSUE_CONFIG:
      case Resource.SSO_USER:
      case Resource.SSO_CLIENT:
        return ["id"];
      default:
        return [
          "id",
          "datasetId",
          "processId",
          "agreementId",
          "transferId",
          "algorithmInstanceId",
          "participantId",
          "credentialId",
          "keyId",
          "requestId",
          "scid"
        ];
    }
  }

  static asGlobalGuard() {
    return {
      provide: APP_GUARD,
      useClass: AbacGuard
    };
  }
}
