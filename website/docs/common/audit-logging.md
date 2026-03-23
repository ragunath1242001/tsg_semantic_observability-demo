---
sidebar_position: 3
---

# Audit Logging

TSG provides shared audit-logging infrastructure for authorization decisions and other security-relevant platform events. The shared implementation lives primarily in `libs/common-api`, uses DTOs from `libs/common-dtos`, and is surfaced in UIs through shared components and composables from `libs/common-ui`.

## Overview

The audit layer has two jobs:

- capture authorization decisions made by the shared ABAC layer
- provide a reusable pipeline for recording other protocol or business events in the same format

The audit stack includes:

- `AuditLogService` for creating and filtering entries
- pluggable handlers for console, database, and external forwarding destinations
- `AuditLogQueryService` and a reusable controller factory for querying entries
- shared UI composables and components for listing and inspecting log entries

## Where Audit Events Come From

### ABAC Guard Decisions

The most important shared capture point is the global `AbacGuard`. When a request reaches a protected endpoint, the guard can emit an audit entry describing:

- who made the request
- whether the request was delegated
- what action and resource were evaluated
- whether access was allowed or denied
- which permission matched, if any

This means the audit log is tightly connected to the shared authorization model.

### Protocol And Business Events

Not all useful audit events are ABAC decisions. `ProtocolAuditService` exists so applications can emit audit entries for protocol-driven or business-driven events while still using the same shared structure, severity handling, and storage pipeline.

Use this when an event matters for traceability but does not naturally pass through the authorization guard, for example a protocol handshake, validation outcome, or transfer lifecycle event.

## What Gets Logged By Default

The audit service applies filters so the log remains useful instead of filling with every successful read request.

By default:

- denied requests are logged
- delegated requests are logged
- successful mutations are logged
- successful execute actions are not logged unless enabled
- successful read actions are not logged unless enabled
- access to sensitive resources is always logged

The default sensitive resources include:

- `w.key`
- `w.credential`
- `sso.user`

This behavior is configurable through the shared audit module configuration.

## Configuration

The built-in audit configuration controls whether logging is enabled, which successful actions are kept, which resources are always logged, and which built-in handlers are active.

## Configuration Parameters

| Key                          | Required | Type                                                      | Description                                                                                        | Default                                 |
| ---------------------------- | -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **`AuditModuleConfig`**      |          |                                                           |                                                                                                    |                                         |
| `enabled`                    |          | `Boolean`                                                 | Enable audit logging                                                                               | `true`                                  |
| `minSeverity`                |          | `"debug" \| "info" \| "warning" \| "error" \| "critical"` | Minimum severity level to log                                                                      | `"info"`                                |
| `logDenied`                  |          | `Boolean`                                                 | Always log denied access attempts regardless of action type                                        | `true`                                  |
| `logDelegated`               |          | `Boolean`                                                 | Log delegated access attempts when enabled, while still respecting action-specific success filters | `true`                                  |
| `logMutations`               |          | `Boolean`                                                 | Log successful mutation actions (`create`, `update`, `delete`, `manage`)                           | `true`                                  |
| `logExecute`                 |          | `Boolean`                                                 | Log successful execute actions                                                                     | `false`                                 |
| `logReads`                   |          | `Boolean`                                                 | Log successful read actions; disabled by default because reads are frequent and often noisy        | `false`                                 |
| `sensitiveResources`         |          | `Resource[]`                                              | Resources that are always logged regardless of action-specific success filters                     | `["w.key", "w.credential", "sso.user"]` |
| `handlers`                   |          | `AuditHandlersConfig`                                     | Handler configuration                                                                              |                                         |
| `otlp`                       |          | `OtlpAuditHandlerConfig`                                  | OTLP audit log handler configuration                                                               |                                         |
| **`AuditHandlersConfig`**    |          |                                                           |                                                                                                    |                                         |
| `handlers.console`           |          | `Boolean`                                                 | Enable console audit log handler                                                                   | `false`                                 |
| `handlers.database`          |          | `Boolean`                                                 | Enable database audit log handler                                                                  | `true`                                  |
| `handlers.otlp`              |          | `Boolean`                                                 | Enable OTLP audit log handler                                                                      | `false`                                 |
| **`OtlpAuditHandlerConfig`** |          |                                                           |                                                                                                    |                                         |
| `otlp.url`                   |          | `String`                                                  | OTLP HTTP logs endpoint URL                                                                        | `"http://localhost:4318/v1/logs"`       |
| `otlp.headers`               |          | `Record<string, string>`                                  | Additional HTTP headers to include in OTLP requests                                                |                                         |
| `otlp.timeoutMillis`         |          | `Number`                                                  | OTLP export timeout in milliseconds                                                                | `5000`                                  |
| `otlp.concurrencyLimit`      |          | `Number`                                                  | Maximum number of concurrent OTLP export requests                                                  | `1`                                     |
| `otlp.serviceName`           |          | `String`                                                  | Service name included on OTLP log attributes                                                       | `"tsg-dsp-api"`                         |
| `otlp.serviceVersion`        |          | `String`                                                  | Optional service version included on OTLP log attributes                                           |                                         |

Typical behavior changes look like this:

```yaml
audit:
  enabled: true
  minSeverity: info
  logDenied: true
  logDelegated: true
  logMutations: true
  logExecute: true
  logReads: false
  sensitiveResources:
    - w.key
    - w.credential
    - sso.user
  handlers:
    console: false
    database: true
    otlp: false
```

Forwarding to an OpenTelemetry collector looks like this:

```yaml
audit:
  handlers:
    console: false
    database: true
    otlp: true

  otlp:
    url: "http://otel-collector:4318/v1/logs"
    serviceName: "control-plane-api"
    serviceVersion: "0.18.0"
    timeoutMillis: 5000
    concurrencyLimit: 1
```

## Built-In Forwarding Options

The shared audit module now includes two built-in external forwarding paths in addition to console and database storage.

### OTLP

The OTLP handler sends audit events as OpenTelemetry logs over HTTP. This is the most flexible forwarding option when you want one integration point that can fan out to multiple downstream systems.

Typical uses:

- sending audit logs to an OpenTelemetry Collector sidecar or gateway
- forwarding to vendors that already accept OTLP
- using the collector to route audit logs onward to Elasticsearch, Loki, Splunk, Datadog, or similar backends

The handler emits the serialized audit event as the log body and also flattens important audit fields into OTLP log attributes so downstream systems can filter and aggregate on them.

## Audit Entry Shape

Audit entries capture both actor context and request context. A typical entry includes:

- timestamp and severity
- correlation ID
- caller identity
- original actor when acting on behalf of a user
- delegation chain
- action and resource
- request environment such as path, method, IP, and user agent
- result details such as allowed, reason, matched permission, and effective scope

Example:

```json
{
  "timestamp": "2026-03-19T10:30:00.000Z",
  "severity": "INFO",
  "correlationId": "corr-123",
  "caller": {
    "sub": "control-plane-api",
    "type": "service",
    "serviceName": "control-plane-api"
  },
  "onBehalfOf": {
    "sub": "user-123",
    "username": "alice"
  },
  "delegationChain": ["control-plane-api"],
  "action": "read",
  "resource": {
    "type": "w.credential",
    "id": "cred-456"
  },
  "environment": {
    "requestPath": "/management/credentials/cred-456",
    "requestMethod": "GET"
  },
  "result": {
    "allowed": true,
    "matchedPermission": "read:w.credential",
    "effectiveScope": "*"
  }
}
```

## Storage And Handlers

The shared audit module supports multiple handlers. The built-in module wires a composite handler that can fan out to more than one destination.

The shared implementation includes:

- console handler
- database handler
- OTLP HTTP handler
- composite handler that can fan out to multiple destinations

The `handlers.console`, `handlers.database`, and `handlers.otlp` flags decide whether those built-in destinations are active.

In practice this means a deployment can:

- keep local console and database storage only
- forward to OTLP while still keeping local storage
- combine several destinations at once through the composite handler

If an application needs a different destination, implement the shared `AuditLogHandler` interface and register that handler in the module wiring for the application. This is the main extension point for forwarding audit logs to another sink such as a SIEM, a message bus, or a tenant-specific store.

Example:

```typescript
export class CustomAuditHandler implements AuditLogHandler {
  async write(entry: AuditLogEntry): Promise<void> {
    await sendToExternalSink(entry);
  }
}
```

In that case the application composes the custom handler into its own provider setup alongside, or instead of, the built-in handlers.

## Querying And Viewing Audit Logs

The shared audit infrastructure includes a reusable controller factory for audit-log endpoints. Applications can expose an audit-log controller scoped to their own audit-log resource while still using the same filtering and pagination model.

Supported query patterns include filtering by:

- severity
- caller identity and caller type
- action
- resource type
- allowed or denied result
- correlation ID
- IP address and request path
- date range

On the UI side, `common-ui` provides shared audit-log table and detail views that can be injected into the route configuration.

## Delegation And Correlation

Audit logs are especially valuable in delegated flows. When a service calls another service on behalf of a user, the log entry can preserve:

- the technical caller service
- the original end user
- the delegation chain
- the correlation ID used across the request path

Without this shared context, audit investigations would show only the service principal and lose the original business actor.
