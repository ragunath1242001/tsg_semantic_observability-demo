import { Action, Resource } from "./permissions.js";

export enum AuditSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

export interface AuditLogEntry {
  timestamp: Date;
  severity: AuditSeverity;
  correlationId?: string;

  caller: {
    sub: string;
    type: "user" | "service" | "system";
    serviceName?: string;
    email?: string;
    didId?: string;
  };

  onBehalfOf?: {
    sub: string;
    email?: string;
    didId?: string;
  };

  delegationChain?: string[];

  action: Action;

  resource: {
    type: Resource;
    id?: string;
  };

  environment: {
    ipAddress?: string;
    userAgent?: string;
    requestPath?: string;
    requestMethod?: string;
  };

  result: {
    allowed: boolean;
    reason?: string;
    matchedPermission?: string;
    effectiveScope?: string;
  };
}

export interface AuditLogConfig {
  enabled: boolean;
  minSeverity: AuditSeverity;
  logDenied: boolean;
  logSuccessful: boolean;
  logDelegated: boolean;
  sensitiveResources?: Resource[];
}
