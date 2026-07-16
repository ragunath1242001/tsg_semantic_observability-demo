# Semantic Observability Progress Report

## Purpose

This work adds semantic observability to the TNO Security Gateway so the system can record, aggregate, persist, and visualize how semantic metadata is used across control-plane and HTTP data-plane workflows.

The goal is to make semantic adoption, metadata quality, validation friction, policy failures, negotiation/transfer stability, and semantic artefact evolution visible to operators and project stakeholders.


## Scope Completed

### 1. Shared Semantic Observability Library

A new shared library was added:

`libs/semantic-observability`

It contains:

- Common event model
- Event types, dimensions, status values, metric names, and artefact types
- Sanitization and pseudonymization helpers
- Report aggregation logic
- Snapshot bucket logic for hourly and daily persisted metrics
- Unit test coverage for snapshot aggregation and report reconstruction

The shared model allows both the control plane and HTTP data plane to emit compatible semantic observability events.

## 2. Control Plane Backend Module

A new module was added:

`apps/control-plane-api/src/semantic-observability`

It provides:

- Event persistence
- Report generation
- Persisted metric snapshots
- Snapshot refresh status
- Management API endpoints
- Observer services for domain workflows

Control-plane instrumentation was added for:

- Catalog dataset creation, update, and deletion
- Contract negotiation state changes and outcomes
- Transfer process state changes and outcomes
- Policy evaluation allow/deny results

## 3. HTTP Data Plane Backend Module

A new module was added:

`apps/http-data-plane-api/src/semantic-observability`

It provides the same observability capabilities for the HTTP data plane:

- Event persistence
- Report generation
- Persisted metric snapshots
- Snapshot refresh status
- Management API endpoints
- Observer services for data-plane workflows

HTTP data-plane instrumentation was added for:

- Dataset configuration observation
- Collection dataset item observation
- Metadata validation results
- Transfer state changes
- Ingress and egress data-plane access
- Access failures and invalid transfer states

## 4. Permissions

New permission resources were added in:

`libs/common-dtos/src/permissions.ts`

New resources:

- `CP_SEMANTIC_OBSERVABILITY`
- `HDP_SEMANTIC_OBSERVABILITY`

Read and manage permissions were added for both.

These protect the management endpoints and UI routes.

## 5. Management API Endpoints

Both the control-plane API and HTTP data-plane API now expose semantic observability management endpoints.

Main endpoints:

- `GET /management/semantic-observability/events`
- `GET /management/semantic-observability/report`
- `GET /management/semantic-observability/report/snapshots`
- `POST /management/semantic-observability/report/snapshots/refresh`
- `GET /management/semantic-observability/report/snapshots/status`

The report endpoints support filters for:

- Time range
- Participant pseudonym
- Remote participant pseudonym
- Participant pair pseudonym
- Dataset pseudonym
- Dataset category
- Artefact type
- Artefact reference
- Artefact version
- Snapshot bucket
- Metric name

## 6. Metrics Implemented

The current implementation produces metrics in four groups.

### Adoption

- Semantic model coverage
- Schema reference coverage
- Metadata completeness score

### Friction

- Validation error rate
- Policy failure count
- Negotiation failure rate
- Transfer failure rate

### Evolution

- Artefact version adoption rate
- Deprecated artefact usage rate

### Stability

- Negotiation success rate
- Transfer success rate
- Average transfer setup latency

## 7. Persisted Metric Snapshots

In addition to calculating reports from raw events, the system now persists aggregate metric snapshots.

Two tables/entities were added in both APIs:

- `semantic_observability_event`
- `semantic_observability_metric_snapshot`

Snapshots support:

- Hourly buckets
- Daily buckets
- Filtered report reconstruction
- Manual refresh through the management API
- Automatic refresh on a configured interval

## 8. Automatic Snapshot Refresh

Automatic refresh was added to both APIs.

Configuration:

- `semanticObservability.enabled`
  - Default: `true`
- `semanticObservability.refreshIntervalInMilliseconds`
  - Default: `3600000`

Behavior:

- Refreshes both `hour` and `day` buckets
- Runs once on application startup
- Continues on the configured interval
- Tracks refresh status and errors

Refresh status includes:

- Enabled state
- Interval
- Buckets
- In-progress state
- Last started time
- Last completed time
- Last error
- Number of refreshed snapshots

## 9. User Interface Dashboard

A shared dashboard view was added:

`libs/common-ui/views/SemanticObservabilityView.vue`

It is wired into both UIs:

- Control Plane UI: `/semantic-observability`
- HTTP Data Plane UI: `/semantic-observability`

The dashboard includes:

- Summary metric cards
- Metric tables for adoption, friction, evolution, and stability
- Filter controls for bucket, metric, date range, participant, dataset, artefact, and version
- Manual snapshot refresh button
- Automatic refresh status panel
- Raw event table with expandable context, artefact, and attribute details

## 10. Verification

The following verification commands passed:

```bash
corepack pnpm --filter @tsg-dsp/semantic-observability build
corepack pnpm --filter @tsg-dsp/semantic-observability test
corepack pnpm --filter @apps/control-plane-api build
corepack pnpm --filter @apps/http-data-plane-api build
corepack pnpm --filter @apps/control-plane-ui build
corepack pnpm --filter @apps/http-data-plane-ui build
corepack pnpm --filter @apps/control-plane-api test
corepack pnpm --filter @apps/http-data-plane-api test
git diff --check
```

Test results:

- Control-plane API: 19 test files, 169 tests passed
- HTTP data-plane API: 5 test files, 51 tests passed
- Shared semantic observability package: 1 test file, 1 test passed

`git diff --check` passed with only Git CRLF warnings.

## 11. Current Status

The semantic observability feature is now implemented across:

- Shared library
- Control-plane backend
- HTTP data-plane backend
- Management APIs
- Permissions
- Persisted snapshots
- Automatic refresh
- Shared frontend dashboard

The feature is ready for review, with one important production-hardening item remaining.

## 12. Recommended Next Step

The next recommended step is to add explicit database migrations for the new semantic observability tables.

Reason:

The entities exist and builds/tests pass, but production deployments should not rely on TypeORM synchronization for schema changes. Migrations should be added for both SQLite and PostgreSQL in:

- `apps/control-plane-api/src/migrations`
- `apps/http-data-plane-api/src/migrations`

Tables to cover:

- `semantic_observability_event`
- `semantic_observability_metric_snapshot`

## 13. Presentation Summary

In short, this work adds a complete semantic observability layer to the gateway:

- It records semantic events from critical control-plane and data-plane workflows.
- It converts those events into measurable semantic adoption, quality, friction, evolution, and stability metrics.
- It stores both raw events and aggregate snapshots.
- It refreshes snapshots automatically.
- It exposes management APIs.
- It provides a dashboard for operators and supervisors to inspect the results.

This creates a foundation for monitoring whether semantic interoperability is improving, where metadata or validation issues occur, and how reliably semantic assets support negotiations and transfers.
