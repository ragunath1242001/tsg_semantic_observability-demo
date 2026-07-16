# Semantic Observability Assignment Update

## Purpose

This document summarizes the current state of the semantic observability work in
the TNO Security Gateway. It is intended as input before the next assignment
meeting, so the discussion can focus on progress, decisions, and open questions
instead of starting from scratch.

## Repository

GitHub repository:

```text
https://github.com/ragunath1242001/tsg_semantic_observability-demo
```

Current branch:

```text
semantic-observability-demo
```

## Current Focus

The implementation focuses on adding a semantic observability layer to the TSG.
The goal is to observe how semantic interoperability behaves during normal
dataspace operations, without inspecting or storing raw business payloads.

The monitored flow is:

```text
provider publishes dataset metadata
consumer requests catalog
contract negotiation starts
agreement is reached
transfer is requested
HTTP Data Plane executes data access
semantic observability records events and metrics
dashboard/API shows evidence
```

This means the dashboard is not the product by itself. The important part is the
listener/observer layer that records evidence while normal TSG data-sharing
actions happen.

## Why TSG Was Chosen

TSG is a suitable implementation target because it already handles the main
operational dataspace workflows:

- catalog publication and discovery
- dataset metadata management
- contract negotiation
- policy evaluation
- transfer processing
- HTTP data-plane access

These are the points where semantic interoperability can succeed, fail, or
create friction. Observing TSG therefore gives runtime evidence about whether
semantic metadata, schemas, policies, and artefact versions are actually used in
real exchanges.

The Knowledge Engine remains relevant for deeper semantic reasoning, but TSG is
the better first implementation point because it exposes the complete operational
flow.

## Main Components Added

### Shared Semantic Observability Library

Location:

```text
libs/semantic-observability/
```

This shared TypeScript library defines the common observability model used by
both the Control Plane and HTTP Data Plane.

It contains:

- semantic observability event types
- dimensions: adoption, friction, evolution, stability
- component names
- status values
- semantic artefact reference types
- privacy and pseudonymization helpers
- sanitization logic
- aggregate metric and report builders
- insight generation helpers

Important files:

```text
libs/semantic-observability/src/events.ts
libs/semantic-observability/src/enums.ts
libs/semantic-observability/src/privacy.ts
libs/semantic-observability/src/sanitizer.ts
libs/semantic-observability/src/aggregates.ts
libs/semantic-observability/src/insights.ts
```

### Control Plane Semantic Observability Module

Location:

```text
apps/control-plane-api/src/semantic-observability/
```

This module records semantic observability events from Control Plane workflows.

It adds:

- event storage
- metric snapshot storage
- management API endpoints
- local report generation
- combined Control Plane + Data Plane reporting
- observer services for catalog, policy, negotiation, and transfer workflows

Important files:

```text
semantic-observability.module.ts
semantic-observability.service.ts
semantic-observability.controller.ts
semantic-observability-combined.service.ts
semantic-observability.dao.ts
catalog-observer.service.ts
negotiation-observer.service.ts
policy-observer.service.ts
transfer-observer.service.ts
```

The module is wired into the Control Plane application and into relevant
workflow modules.

### HTTP Data Plane Semantic Observability Module

Location:

```text
apps/http-data-plane-api/src/semantic-observability/
```

This module records semantic observability events from HTTP Data Plane
configuration and data-access workflows.

It adds:

- event storage
- metric snapshot storage
- management API endpoints
- report and insight generation
- observer services for dataset configuration and transfer execution

Important files:

```text
semantic-observability.module.ts
semantic-observability.service.ts
semantic-observability.controller.ts
semantic-observability.dao.ts
dataset-config-observer.service.ts
transfer-execution-observer.service.ts
```

The module is wired into the HTTP Data Plane application, transfer module, and
dataset configuration flow.

### User Interface Views

Semantic observability views were added to both UIs:

```text
apps/control-plane-ui/src/views/SemanticObservability.vue
apps/http-data-plane-ui/src/views/SemanticObservability.vue
```

The UI supports:

- viewing metrics
- viewing data-sharing process signals
- viewing raw observability events
- filtering by time range, event type, metric, participant, dataset, artefact,
  version, and status
- refreshing metric snapshots
- viewing trends and drilldowns
- inspecting generated insights

The Control Plane UI can show combined Control Plane and Data Plane evidence
through the combined observability API.

## Events Currently Recorded

The current implementation records these event types:

- `catalog.metadata.observed`
- `dataset.configuration.observed`
- `dataset.metadata.changed`
- `metadata.validation.result`
- `policy.evaluation.result`
- `negotiation.state.changed`
- `transfer.state.changed`
- `data-plane.access.observed`

These events are grouped into four observability dimensions:

- adoption: whether semantic models, schemas, policies, and metadata are used
- friction: where validation, policy, negotiation, or transfer problems occur
- evolution: how semantic artefacts and versions change over time
- stability: whether negotiations, transfers, and data access succeed reliably

## Metrics Produced

Events are aggregated into metrics such as:

- semantic model coverage
- schema reference coverage
- metadata completeness score
- validation error rate
- policy failure count
- negotiation success and failure rate
- transfer success and failure rate
- data-plane access success and failure rate
- average transfer setup latency
- artefact version adoption rate
- deprecated artefact usage rate

Metric snapshots can be generated by hour or by day.

## Privacy Approach

The observability layer is designed to avoid storing raw business payloads.

The implementation:

- pseudonymizes participant identifiers
- pseudonymizes dataset identifiers
- pseudonymizes negotiation, agreement, transfer, correlation, and trace IDs
- sanitizes attributes
- redacts sensitive error messages
- avoids storing API response bodies or shared data payloads

Tests exist for the privacy behavior in:

```text
libs/semantic-observability/src/privacy.test.ts
```

## Storage Model

Each component stores its own observability data.

Control Plane stores:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

HTTP Data Plane stores:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

The Control Plane does not directly write Data Plane observability records into
its database. Instead, it fetches Data Plane observability data through the Data
Plane management API when a combined report is requested.

This keeps raw event ownership local to the component that generated the event,
while still allowing a unified dashboard/report.

## Demo Work

### Local Smoke Demo

A smoke demo script exists for validating the listener behavior:

```text
scripts/semantic-observability-demo.ps1
```

It checks the Control Plane and HTTP Data Plane APIs, updates a dataset
configuration, adds demo catalog metadata, refreshes snapshots, and prints
recent observability events and metric counts.

This proves that the listener layer records Control Plane and HTTP Data Plane
signals.

### Docker Client Demo

A Docker-based demo exists here:

```text
demo/semantic-observability/
```

This is intended for easier client testing. It runs:

- Alfa Control Plane
- Alfa HTTP Data Plane
- embedded UIs
- semantic observability enabled in both components

The client can run the demo without setting up Node.js, pnpm, or Vite locally.

### Two-Party Sharing Demo

A stronger validation scenario exists here:

```text
demo/semantic-observability-sharing/
```

This scenario runs four services:

- Alfa Control Plane as provider
- Alfa HTTP Data Plane as provider data plane
- Bravo Control Plane as consumer
- Bravo HTTP Data Plane as consumer data plane

The sharing script performs the actual exchange path:

```text
Bravo requests Alfa catalog
Bravo starts contract negotiation
Alfa agrees
Bravo verifies
Alfa finalizes
Bravo requests HTTP transfer
Bravo Data Plane executes data access through Alfa Data Plane
both control planes refresh observability snapshots
recent observability events are printed
```

This is the preferred validation path because it shows observability during a
real TSG data-sharing process instead of only synthetic events.

## What Is Working

The following parts are implemented and working at code level:

- shared semantic observability event model
- privacy-preserving sanitization and pseudonymization
- event persistence in Control Plane and HTTP Data Plane
- metric snapshot persistence
- report generation from raw events
- report generation from persisted metric snapshots
- automatic snapshot refresh support
- manual snapshot refresh endpoints
- Control Plane combined reporting across registered Data Planes
- Control Plane observer integration for catalog, policy, negotiation, transfer
- HTTP Data Plane observer integration for dataset configuration and access
- UI pages for viewing events, metrics, trends, and insights
- tests for aggregation and privacy helpers

Previously verified commands:

```powershell
corepack pnpm --filter @tsg-dsp/semantic-observability test
corepack pnpm --filter control-plane-api build
corepack pnpm --filter http-data-plane-api build
corepack pnpm --filter control-plane-ui build
corepack pnpm --filter http-data-plane-ui build
```

## Known Limitations

The first smoke demo can skip policy evaluation because it uses synthetic data.
A real stored agreement is required for a proper policy and transfer validation.

The two-party sharing demo is therefore the better next validation target.

Other open points:

- decide whether demo SQLite databases are enough or whether Postgres should be
  used for longer-running tests
- define retention policy for raw observability events
- decide whether production combined reporting should remain live-fetched or use
  a central aggregated collector
- review which local configuration files should be committed and which should
  remain demo-only
- improve documentation around exact client test steps and expected output

## Open Questions For The Meeting

1. Should the thesis evaluation focus mainly on the two-party TSG sharing demo?
2. Is the current privacy model acceptable for the prototype, where raw events
   remain local and only sanitized/aggregated data is shown?
3. Should the next milestone be a polished client demo or deeper metric
   validation?
4. Should the Knowledge Engine be connected later as an optional semantic
   reasoning source, or kept outside the first prototype scope?
5. Which output is preferred for evaluation: dashboard screenshots, API output,
   generated report, or a combination?

