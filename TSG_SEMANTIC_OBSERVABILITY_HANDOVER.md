# TSG Semantic Observability Handover

## Current Architecture Decision

The observability component is now intentionally scoped to **core passive observability only**.

Core rule:

- TSG observability listens to existing workflows.
- It records privacy-safe derived signals.
- It does not participate in catalog, negotiation, policy, transfer, or data-plane sharing decisions.
- It does not inspect raw data payloads.
- It does not fetch semantic artefacts.
- It does not call Semantic Treehouse or any external validator.
- It does not run RDF/OWL/SHACL artefact analysis.

The previous semantic artefact analysis and Treehouse integration work was removed to keep the component truly privacy-preserving.

## What Remains

### Shared Semantic Observability Library

Location:

`libs/semantic-observability`

Responsibilities:

- Defines semantic observability event types, dimensions, statuses, artefact reference types, and metric names.
- Creates semantic observability events.
- Sanitizes telemetry before persistence.
- Pseudonymizes participant, dataset, transfer, agreement, negotiation, correlation, trace, and artefact identifiers.
- Redacts sensitive free-text attributes.
- Builds privacy-safe aggregate reports.
- Builds persisted hourly/daily metric snapshots.
- Reconstructs reports from snapshots.

### Control Plane Observability

Location:

`apps/control-plane-api/src/semantic-observability`

Responsibilities:

- Persists sanitized semantic observability events.
- Persists aggregate metric snapshots.
- Exposes management endpoints for events, reports, snapshots, and refresh status.
- Exposes combined read-only endpoints that merge local control-plane observability with sanitized observability from registered HTTP data planes.
- Refreshes snapshots automatically on startup and configured interval.
- Records passive events from control-plane workflows.

Observers:

- `CatalogObserverService`
- `PolicyObserverService`
- `NegotiationObserverService`
- `TransferObserverService`
- `SemanticObservabilityService`

Instrumented workflows:

- Dataset catalog observation.
- Policy evaluation allow/deny.
- Negotiation state changes.
- Transfer state changes.

### HTTP Data Plane Observability

Location:

`apps/http-data-plane-api/src/semantic-observability`

Responsibilities:

- Mirrors the control-plane observability service for HTTP data-plane workflows.
- Persists sanitized semantic observability events and snapshots.
- Exposes the same management endpoint shape.
- Refreshes snapshots automatically.

Observers:

- `DatasetConfigObserverService`
- `TransferExecutionObserverService`
- `SemanticObservabilityService`

Instrumented workflows:

- Dataset configuration observation.
- Collection dataset item observation.
- Metadata validation result.
- Transfer execution state changes.
- Ingress and egress data-plane access.
- Access failures.

### User Interface

Location:

`libs/common-ui/views/SemanticObservabilityView.vue`

Routes:

- Control Plane UI: `/semantic-observability`
- HTTP Data Plane UI: `/semantic-observability`

Current shared UI behavior:

- One shared observability dashboard is used by both UIs.
- The page has a single-dashboard layout instead of separate control-plane/data-plane dashboards.
- The page supports optional `Participant A` and `Participant B` dropdown filters based on pseudonymized participant identifiers.
- The page supports filtering by component, signal, metric, status, dataset pseudonym, artefact type, and artefact version.
- The page exposes tabs for `Metrics`, `Data sharing`, `Signals`, `Trends`, and `Events`.
- In the control-plane UI, the page prefers combined observability endpoints and falls back to local endpoints when combined aggregation is unavailable.
- In the HTTP data-plane UI, the page uses local observability endpoints through the same fallback logic.

The artefact-analysis UI route and view were removed.

### Current Session Status

Latest implementation status:

- Combined control-plane aggregation endpoints are implemented.
- The shared dashboard UI for combined observability is implemented.
- The dashboard uses only sanitized observability APIs and does not access raw payload data.
- The control-plane UI blank-page issue was debugged and partially addressed in code.

Latest UI stability fixes:

- `apps/control-plane-ui/src/main.ts` now correctly imports `DataView`.
- `apps/control-plane-ui/src/App.vue` no longer fails hard when `/settings` cannot be loaded during startup.
- `libs/common-ui/stores/user.ts` no longer blocks Vue startup if `/auth/user` is unavailable during development.

Important runtime note:

- At the end of this session, the Vite dev server was reachable at `http://127.0.0.1:5173/`.
- The control-plane API was **not** reachable on `http://127.0.0.1:3000`.
- Because the control-plane UI Vite proxy targets port `3000`, live dashboard data will not load until the control-plane API is running there or the Vite proxy target is changed.
- The earlier blank page was caused by startup API failures while the backend was unavailable.

## Privacy-Preserving Behavior

Configuration under `semanticObservability`:

- `enabled`: defaults to `true`.
- `refreshIntervalInMilliseconds`: defaults to `3600000`.

Runtime behavior:

- Persisted observability events are sanitized centrally before database save.
- Dataset and participant identifiers are pseudonymized.
- Negotiation id, agreement id, transfer id, correlation id, and trace id are pseudonymized before persistence.
- Raw semantic artefact references are never persisted; stable pseudonymized references are stored instead.
- Sensitive free-text attributes such as error messages, tokens, credentials, payload/body/content values, authorization headers, and cookies are redacted.
- Snapshot refresh errors expose only a generic failure status.
- Privacy sanitization is not configurable at runtime.
- No raw dataset payload is read or stored by observability.
- No semantic artefact content is fetched, parsed, stored, or forwarded.
- No external validator or Treehouse call is made.
- The combined dashboard fetches only sanitized observability events/reports/snapshots from data-plane management observability endpoints.

## Currently Observed Signals

The current implementation stores sanitized observability events first, then builds aggregate reports and snapshots from those stored events.

### Event Dimensions

Events are grouped into four dimensions:

- `adoption`: semantic reference presence and metadata completeness.
- `friction`: validation, policy, negotiation, transfer, and access failures.
- `evolution`: semantic artefact version usage and deprecated/legacy references.
- `stability`: negotiation, transfer, and data-plane access success over time.

### Control Plane Events

`CatalogObserverService` records:

- Dataset catalog create/update/delete observations.
- Dataset semantic model/profile references from `conformsTo`.
- Distribution schema/OpenAPI references from distribution `conformsTo`.
- Policy profile references from dataset policies.
- Dataset pseudonym.
- Dataset version.
- Distribution count.
- Policy count.
- Metadata completeness score.

`PolicyObserverService` records:

- Policy allow/deny result.
- Role, scope, and action.
- Pseudonymized dataset, local participant, remote participant, transfer id, and agreement id.
- Failure category `policy_evaluation_denied` for denied decisions.

`NegotiationObserverService` records:

- Negotiation state changes.
- Negotiation role and local/remote direction.
- Pseudonymized negotiation id, agreement id, dataset, and remote participant.
- Failure category `negotiation_terminated` for terminated negotiations.

`TransferObserverService` records:

- Transfer state changes.
- Transfer role, direction, and format.
- Pseudonymized transfer id, agreement id, and remote participant.
- Failure category `transfer_interrupted` for suspended or terminated transfers.

### HTTP Data Plane Events

`DatasetConfigObserverService` records:

- Dataset configuration observations.
- Collection dataset item observations.
- Base semantic model references.
- Dataset version semantic model references.
- Schema references.
- OpenAPI spec references.
- Dataset pseudonym.
- Dataset type.
- Validation-extra-properties flag.
- Version count and current version for versioned datasets.
- Media type and item version for collection items.
- Policy presence.
- Metadata completeness score.

`DatasetConfigObserverService` also records metadata validation results:

- Validation level: `error`, `warn`, or `ignore`.
- Success, warning, or failure status.
- Validation error count.
- Failure category `extra_props_validation` when validation fails.
- Raw validation error messages are redacted before persistence.

`TransferExecutionObserverService` records:

- HTTP data-plane transfer state changes.
- Pseudonymized transfer id, dataset, and remote participant.
- Transfer role.
- Ingress and egress access observations.
- HTTP method.
- HTTP status code.
- Failure category `client_or_authorization_error` for 4xx responses.
- Failure category `backend_or_proxy_error` for 5xx responses.
- Failure category `proxy_execution_error` for proxy exceptions.
- Raw proxy exception messages are redacted before persistence.

## Currently Computed Metrics

Reports and hourly/daily snapshots currently compute these metric names:

- `semantic_model_coverage`
- `schema_reference_coverage`
- `metadata_completeness_score`
- `validation_error_rate`
- `policy_failure_count`
- `negotiation_success_rate`
- `negotiation_failure_rate`
- `transfer_success_rate`
- `transfer_failure_rate`
- `average_transfer_setup_latency`
- `artefact_version_adoption_rate`
- `deprecated_artefact_usage_rate`

Metric grouping:

- Adoption metrics: `semantic_model_coverage`, `schema_reference_coverage`, `metadata_completeness_score`.
- Friction metrics: `validation_error_rate`, `policy_failure_count`, `negotiation_failure_rate`, `transfer_failure_rate`.
- Evolution metrics: `artefact_version_adoption_rate`, `deprecated_artefact_usage_rate`.
- Stability metrics: `negotiation_success_rate`, `transfer_success_rate`, `average_transfer_setup_latency`.

Current limitation:

- Data-plane access events are stored, but there is not yet a dedicated `data_plane_access_success_rate` or `data_plane_access_failure_rate` metric in the aggregate builder.
- Policy allow/deny is currently exposed as `policy_failure_count`; there is not yet a separate policy success rate.
- Transfer setup latency is supported by the event/metric model, but current transfer observers do not yet populate `durationMs`.

Allowed signal types:

- Counts.
- Rates.
- Statuses.
- Categories.
- Versions.
- Pseudonyms.
- Hashes/pseudonymized references.
- Time buckets.

Disallowed in core observability:

- Raw payload values.
- Raw dataset content.
- Raw sensitive identifiers.
- Full validation messages if they may include data values.
- Automatic artefact fetching.
- Treehouse validation calls.
- RDF/OWL/SHACL analysis.

## Database Tables

### `semantic_observability_event`

Stores sanitized semantic observability events.

### `semantic_observability_metric_snapshot`

Stores privacy-safe aggregate metric snapshots.

The `semantic_artefact_analysis` table and related migrations were removed.

## Management Endpoints

Base path:

`/management/semantic-observability`

Endpoints:

- `GET /management/semantic-observability/events`
- `GET /management/semantic-observability/report`
- `GET /management/semantic-observability/report/snapshots`
- `GET /management/semantic-observability/report/snapshots/status`
- `POST /management/semantic-observability/report/snapshots/refresh`

Control-plane combined endpoints:

- `GET /management/semantic-observability/combined/events`
- `GET /management/semantic-observability/combined/report`
- `GET /management/semantic-observability/combined/report/snapshots`
- `GET /management/semantic-observability/combined/report/snapshots/status`
- `POST /management/semantic-observability/combined/report/snapshots/refresh`

Combined endpoint behavior:

- Available from the control-plane API.
- Reads registered data-plane `managementAddress` values.
- Calls each data plane's sanitized `semantic-observability` management endpoints.
- Merges local control-plane and remote data-plane observability responses.
- Continues returning local control-plane observability when a data plane is unavailable.
- Does not fetch raw payloads or semantic artefact contents.

Removed endpoint group:

- `/management/semantic-artefact-analysis`

## Removed Components

Removed to preserve the passive-listener architecture:

- `libs/semantic-artefact-analysis`
- `apps/control-plane-api/src/semantic-artefact-analysis`
- `apps/http-data-plane-api/src/semantic-artefact-analysis`
- `libs/common-ui/views/SemanticArtefactAnalysisView.vue`
- Control-plane and HTTP data-plane artefact-analysis routes.
- Treehouse config classes and `semanticTreehouse` root config.
- Automatic artefact analysis config.
- Artefact-analysis database migrations.
- `@tsg-dsp/semantic-artefact-analysis` dependencies from both APIs.
- Direct `jsonld` additions that were only needed by artefact analysis.

## Recommended Next Work

### 1. Derived Field Usage Signals

If field-level observability is required, emit only privacy-safe derived signals:

- Pseudonymized field path.
- Field presence count.
- Observation count.
- Missing-required-field count.
- Validation rule category.
- Schema/model version.

Do not emit field values.

### 2. Validation Failure Taxonomy

Standardize validation failure categories so reports can show:

- Which version causes most failures.
- Which validation category is dominant.
- Which participant pair sees repeated semantic friction.

Do not store raw validation messages.

### 3. Snapshot and Reporting Improvements

Improve reporting around:

- Version-to-failure correlation.
- Metadata completeness over time.
- Participant-pair interoperability trends.
- Validation category trends.
- Transfer/negotiation outcomes by semantic version.

### 4. Optional Separate Offline Analyser

If semantic artefact validation is needed later, build it as a separate offline/admin-controlled component outside the core observability listener.

Rules for that separate component:

- Never runs automatically from runtime events.
- Never participates in data sharing workflows.
- Uses only public or explicitly approved artefacts.
- Has separate config, permissions, storage, and privacy review.
- Does not weaken the passive core observability guarantee.

## Practical Continuation Point

The next useful implementation step is to add privacy-safe derived field usage and validation-category signals into existing observers, without adding raw payload inspection or any external calls.

For the UI, the shared observability page now prefers the control-plane combined endpoints and falls back to local endpoints when the host backend does not expose combined aggregation.

Immediate continuation checklist for the next session:

- Start or verify the control-plane API on `http://127.0.0.1:3000` so the control-plane UI Vite proxy can reach it.
- Open `http://127.0.0.1:5173/#/semantic-observability` and verify that the shared dashboard renders instead of a blank page.
- Verify that the control-plane combined endpoints return data:
  - `/management/semantic-observability/combined/events`
  - `/management/semantic-observability/combined/report/snapshots`
  - `/management/semantic-observability/combined/report/snapshots/status`
- If data-plane observability is expected in the merged dashboard, verify that registered data planes have reachable `managementAddress` values and that their local `semantic-observability` endpoints respond.
- After runtime verification, the next product-level work is likely one of:
  - add explicit data-plane access rate metrics,
  - add policy success-rate metrics,
  - add field-usage/validation-category derived signals,
  - tighten the UI around participant-pair drilldown and metric-to-signal correlation.
