import { Injectable, Logger } from "@nestjs/common";
import {
  Action,
  AuditLogConfig,
  AuditLogEntry,
  AuditSeverity,
  EnvironmentAttributes,
  PolicyResult,
  RequestActor,
  Resource
} from "@tsg-dsp/common-dtos";

export interface AuditLogHandler {
  write(entry: AuditLogEntry): Promise<void>;
}

@Injectable()
export class ConsoleAuditLogHandler implements AuditLogHandler {
  private readonly logger = new Logger("AuditLog");

  async write(entry: AuditLogEntry): Promise<void> {
    const logMessage = this.formatEntry(entry);

    switch (entry.severity) {
      case AuditSeverity.DEBUG:
        this.logger.debug(logMessage);
        break;
      case AuditSeverity.INFO:
        this.logger.log(logMessage);
        break;
      case AuditSeverity.WARNING:
        this.logger.warn(logMessage);
        break;
      case AuditSeverity.ERROR:
      case AuditSeverity.CRITICAL:
        this.logger.error(logMessage);
        break;
    }
  }

  private formatEntry(entry: AuditLogEntry): string {
    return JSON.stringify({
      type: "ABAC_AUDIT",
      ...entry,
      timestamp: entry.timestamp.toISOString()
    });
  }
}

@Injectable()
export class AuditLogService {
  private readonly severityOrder = [
    AuditSeverity.DEBUG,
    AuditSeverity.INFO,
    AuditSeverity.WARNING,
    AuditSeverity.ERROR,
    AuditSeverity.CRITICAL
  ];

  constructor(
    private readonly handler: AuditLogHandler,
    private readonly config: AuditLogConfig
  ) {}

  async log(params: {
    caller: RequestActor;
    onBehalfOf?: RequestActor;
    delegationChain?: string[];
    correlationId?: string;
    action: Action;
    resource: Partial<{ type: Resource; id?: string }>;
    environment: EnvironmentAttributes;
    result: PolicyResult;
    severity?: AuditSeverity;
  }): Promise<void> {
    if (!this.config.enabled) return;

    const severity = params.severity || this.determineSeverity(params.result);
    const isDelegated = !!params.onBehalfOf;

    if (
      !this.shouldLog(
        severity,
        params.result,
        params.action,
        params.resource.type,
        isDelegated
      )
    ) {
      return;
    }

    const entry: AuditLogEntry = {
      timestamp: params.environment.timestamp || new Date(),
      severity,
      correlationId: params.correlationId || params.environment.correlationId,
      caller: {
        sub: params.caller.sub,
        type: params.caller.type,
        serviceName: params.caller.serviceName,
        username: params.caller.username,
        didId: params.caller.didId
      },
      onBehalfOf: params.onBehalfOf
        ? {
            sub: params.onBehalfOf.sub,
            username: params.onBehalfOf.username,
            didId: params.onBehalfOf.didId
          }
        : undefined,
      delegationChain: params.delegationChain,
      action: params.action,
      resource: {
        type: params.resource.type!,
        id: params.resource.id
      },
      environment: {
        ipAddress: params.environment.ipAddress,
        userAgent: params.environment.userAgent,
        requestPath: params.environment.requestPath,
        requestMethod: params.environment.requestMethod
      },
      result: {
        allowed: params.result.allowed,
        reason: params.result.reason,
        matchedPermission: params.result.matchedPermission,
        effectiveScope: params.result.effectiveScope
      }
    };

    await this.handler.write(entry);
  }

  private determineSeverity(result: PolicyResult): AuditSeverity {
    return result.allowed ? AuditSeverity.INFO : AuditSeverity.WARNING;
  }

  private shouldLog(
    severity: AuditSeverity,
    result: PolicyResult,
    action: Action,
    resourceType?: Resource,
    isDelegated?: boolean
  ): boolean {
    const isMutation =
      action === Action.CREATE ||
      action === Action.UPDATE ||
      action === Action.DELETE ||
      action === Action.MANAGE;

    if (result.allowed) {
      if (isMutation && !this.config.logMutations) return false;
      if (action === Action.EXECUTE && !this.config.logExecute) return false;
      if (action === Action.READ && !this.config.logReads) return false;
    }

    // Always log denied attempts if configured
    if (!result.allowed && this.config.logDenied) {
      return true;
    }

    // Always log delegated access if configured, but still respect the
    // action-specific success filters above to avoid noisy delegated reads.
    if (isDelegated && this.config.logDelegated) {
      return true;
    }

    // Always log access to sensitive resources
    if (
      resourceType &&
      this.config.sensitiveResources?.includes(resourceType)
    ) {
      return true;
    }

    const severityIndex = this.severityOrder.indexOf(severity);
    const minSeverityIndex = this.severityOrder.indexOf(
      this.config.minSeverity
    );
    return severityIndex >= minSeverityIndex;
  }
}

export function createAuditLogService(
  config: Partial<AuditLogConfig> = {},
  handler?: AuditLogHandler
): AuditLogService {
  const defaultConfig: AuditLogConfig = {
    enabled: true,
    minSeverity: AuditSeverity.INFO,
    logDenied: true,
    logDelegated: true,
    logMutations: true,
    logExecute: false,
    logReads: false,
    sensitiveResources: [
      Resource.W_KEY,
      Resource.W_CREDENTIAL,
      Resource.SSO_USER
    ]
  };

  return new AuditLogService(handler || new ConsoleAuditLogHandler(), {
    ...defaultConfig,
    ...config
  });
}
