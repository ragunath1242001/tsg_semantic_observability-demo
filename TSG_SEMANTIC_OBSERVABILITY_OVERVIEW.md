# TSG Semantic Observability Overview

## Purpose

The TSG semantic observability component is a privacy-preserving passive listener for semantic interoperability signals.

It observes existing TSG workflows and stores derived telemetry only. It does not inspect raw data payloads, fetch semantic artefacts, run artefact validation, or call external vocabulary/validation systems.

## Core Scope

Included:

- Sanitized observability events.
- Pseudonymized context.
- Aggregate metrics.
- Snapshot reports.
- Control-plane observations.
- HTTP data-plane observations.
- Semantic observability dashboard.

Excluded:

- Semantic artefact analysis.
- RDF/OWL/SHACL validation.
- Semantic Treehouse integration.
- Automatic artefact fetching.
- Raw payload inspection.
- Raw validation-message persistence.

## Main Runtime Flow

```text
TSG workflow executes
  -> observer receives workflow metadata
  -> event is converted to privacy-safe telemetry
  -> event is sanitized before persistence
  -> aggregate reports/snapshots are generated from stored events
```

There is no outbound validation or artefact fetching in the core observability path.

## Metrics

The framework can report:

- Semantic model coverage.
- Schema/profile reference coverage.
- Metadata completeness.
- Validation failure rate.
- Validation error count.
- Failure categories.
- Policy allow/deny rates.
- Negotiation success/failure rates.
- Transfer success/failure rates.
- Data-plane access success/failure rates.
- Transfer setup latency.
- Artefact version adoption.
- Deprecated artefact usage when signaled.
- Participant-pair interoperability trends with pseudonyms.

## Privacy Controls

Behavior:

- Participant and dataset identifiers are pseudonymized.
- Operational ids are pseudonymized.
- Artefact references are always pseudonymized.
- Sensitive attributes are redacted.
- Snapshot refresh errors expose only a generic failure status.
- Raw data payloads are never stored.
- Raw semantic artefact contents are never fetched or forwarded.
- Privacy sanitization is not configurable at runtime.

## API Endpoints

Base path:

`/management/semantic-observability`

Endpoints:

- `GET /management/semantic-observability/events`
- `GET /management/semantic-observability/report`
- `GET /management/semantic-observability/report/snapshots`
- `GET /management/semantic-observability/report/snapshots/status`
- `POST /management/semantic-observability/report/snapshots/refresh`

## UI

Routes:

- Control Plane UI: `/semantic-observability`
- HTTP Data Plane UI: `/semantic-observability`

View:

- `libs/common-ui/views/SemanticObservabilityView.vue`

## Removed For Privacy

The semantic artefact analysis and Treehouse-related components were removed because the project objective is strict privacy-preserving passive observability.

Removed:

- Artefact-analysis APIs.
- Artefact-analysis UI.
- Artefact-analysis library.
- Artefact-analysis database table/migrations.
- Treehouse client/config.
- Automatic artefact analysis from runtime events.

Future artefact validation, if needed, should be a separate offline/admin workflow, not part of core observability.
