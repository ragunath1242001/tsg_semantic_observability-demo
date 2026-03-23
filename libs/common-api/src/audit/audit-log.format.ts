import { AuditLogEntry } from "@tsg-dsp/common-dtos";

export type SerializedAuditLogEntry = Omit<AuditLogEntry, "timestamp"> & {
  timestamp: string;
};

export function serializeAuditLogEntry(
  entry: AuditLogEntry
): SerializedAuditLogEntry {
  return {
    ...entry,
    timestamp: entry.timestamp.toISOString()
  };
}

export function flattenAuditLogEntry(
  entry: AuditLogEntry
): Record<string, string | boolean> {
  return {
    "audit.timestamp": entry.timestamp.toISOString(),
    "audit.severity": entry.severity,
    ...(entry.correlationId
      ? { "audit.correlation_id": entry.correlationId }
      : {}),
    "audit.caller.sub": entry.caller.sub,
    "audit.caller.type": entry.caller.type,
    ...(entry.caller.serviceName
      ? { "audit.caller.service_name": entry.caller.serviceName }
      : {}),
    ...(entry.caller.username
      ? { "audit.caller.username": entry.caller.username }
      : {}),
    ...(entry.caller.didId
      ? { "audit.caller.did_id": entry.caller.didId }
      : {}),
    ...(entry.onBehalfOf?.sub
      ? { "audit.on_behalf_of.sub": entry.onBehalfOf.sub }
      : {}),
    ...(entry.onBehalfOf?.username
      ? { "audit.on_behalf_of.username": entry.onBehalfOf.username }
      : {}),
    ...(entry.onBehalfOf?.didId
      ? { "audit.on_behalf_of.did_id": entry.onBehalfOf.didId }
      : {}),
    ...(entry.delegationChain?.length
      ? {
          "audit.delegation_chain": JSON.stringify(entry.delegationChain)
        }
      : {}),
    "audit.action": entry.action,
    "audit.resource.type": entry.resource.type,
    ...(entry.resource.id ? { "audit.resource.id": entry.resource.id } : {}),
    ...(entry.environment.ipAddress
      ? { "audit.environment.ip_address": entry.environment.ipAddress }
      : {}),
    ...(entry.environment.userAgent
      ? { "audit.environment.user_agent": entry.environment.userAgent }
      : {}),
    ...(entry.environment.requestPath
      ? { "audit.environment.request_path": entry.environment.requestPath }
      : {}),
    ...(entry.environment.requestMethod
      ? {
          "audit.environment.request_method": entry.environment.requestMethod
        }
      : {}),
    "audit.result.allowed": entry.result.allowed,
    ...(entry.result.reason
      ? { "audit.result.reason": entry.result.reason }
      : {}),
    ...(entry.result.matchedPermission
      ? {
          "audit.result.matched_permission": entry.result.matchedPermission
        }
      : {}),
    ...(entry.result.effectiveScope
      ? { "audit.result.effective_scope": entry.result.effectiveScope }
      : {})
  };
}
