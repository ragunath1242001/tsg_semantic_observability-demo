import { Action, Resource } from "./permissions.js";

type AuditFilterValue<T> = T | T[];

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
    username?: string;
    didId?: string;
  };

  onBehalfOf?: {
    sub: string;
    username?: string;
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
  logDelegated: boolean;
  logMutations: boolean;
  logExecute: boolean;
  logReads: boolean;
  sensitiveResources?: Resource[];
}

export interface AuditLogQueryParams {
  page?: number;
  perPage?: number;
  orderBy?: string;
  order?: "ASC" | "DESC";

  severity?: AuditFilterValue<AuditSeverity>;
  callerSub?: string;
  callerType?: "user" | "service" | "system";
  action?: AuditFilterValue<Action>;
  resourceType?: AuditFilterValue<Resource | string>;
  resultAllowed?: boolean;
  correlationId?: string;
  ipAddress?: string;
  requestPath?: string;

  from?: string; // ISO 8601
  to?: string; // ISO 8601

  search?: string;
}
