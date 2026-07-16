# Semantic Observability Current Update

Last updated: 2026-06-11

This file is the resume point for the semantic observability work. When the user says to go through this file, read this first and use it as the current state of the implementation.

## Goal

Build semantic observability as separate Control Plane and HTTP Data Plane dashboard experiences inside the existing TSG applications.

The dashboards must observe internal control-plane and data-plane execution signals. Users or participants do not need to manually do anything for the dashboard. It is populated from captured internal events, generated metric snapshots, and insight generation.

## Important Product Decisions

- Keep Control Plane and HTTP Data Plane dashboards separate.
- Do not use a common semantic observability UI module.
- The semantic observability UI is implemented separately inside each app module:
  - `apps/control-plane-ui/src/views/SemanticObservability.vue`
  - `apps/http-data-plane-ui/src/views/SemanticObservability.vue`
- Existing TSG dashboard pages should not be redesigned or replaced.
- We only add a `Semantic Observability` navigation entry and route into the existing app shell.
- The dashboard listens to/uses captured internal execution data. It should not require sensitive raw data for insights.
- Sensitive fields should be pseudonymized or aggregated before dashboard/insight use.

## Dashboard Links

Local development links:

- Control Plane UI: `http://127.0.0.1:5173/#/semantic-observability`
- HTTP Data Plane UI: `http://127.0.0.1:5174/#/semantic-observability`

If the page cannot be reached, check whether the corresponding Vite dev server is running.

## API Endpoints

Both plane APIs expose semantic observability management endpoints under:

- `/management/semantic-observability/report/snapshots`
- `/management/semantic-observability/events`
- `/management/semantic-observability/insights`
- `/management/semantic-observability/report/snapshots/status`
- `/management/semantic-observability/report/snapshots/refresh`

Control Plane also has combined endpoints for cross-plane data:

- `/management/semantic-observability/combined/insights`
- `/management/semantic-observability/combined/data-plane/insights`

The previous error `Cannot GET /management/semantic-observability/insights?bucket=day` was handled by adding/wiring the insights endpoint.

## Backend Implementation Areas

Shared semantic observability library:

- `libs/semantic-observability/`
- `libs/semantic-observability/src/insights.ts`
- `libs/semantic-observability/src/index.ts`

API modules:

- `apps/control-plane-api/src/semantic-observability/`
- `apps/http-data-plane-api/src/semantic-observability/`

Database/migrations:

- `apps/control-plane-api/src/migrations/20260601120000-postgres.ts`
- `apps/control-plane-api/src/migrations/20260601120000-sqlite.ts`
- `apps/http-data-plane-api/src/migrations/20260601120100-postgres.ts`
- `apps/http-data-plane-api/src/migrations/20260601120100-sqlite.ts`

SQLite wiring:

- Control Plane config was changed from in-memory storage to `test.db` in `apps/control-plane-api/config.yaml`.
- This was done so captured snapshots can persist locally during testing.

## UI Implementation Areas

Control Plane UI:

- `apps/control-plane-ui/src/views/SemanticObservability.vue`
- `apps/control-plane-ui/src/main.ts`
- `apps/control-plane-ui/src/App.vue`
- `apps/control-plane-ui/src/router/route-permissions.ts`
- `apps/control-plane-ui/src/utils/date.ts`
- `apps/control-plane-ui/src/utils/error.ts`
- `apps/control-plane-ui/src/utils/http.ts`

HTTP Data Plane UI:

- `apps/http-data-plane-ui/src/views/SemanticObservability.vue`
- `apps/http-data-plane-ui/src/main.ts`
- `apps/http-data-plane-ui/src/router/route-permissions.ts`
- `apps/http-data-plane-ui/src/utils/date.ts`
- `apps/http-data-plane-ui/src/utils/error.ts`
- `apps/http-data-plane-ui/src/utils/http.ts`

Shared permissions/routes touched:

- `libs/common-dtos/src/permissions.ts`
- `libs/common-ui/router/route-permissions.ts`
- `libs/common-ui/stores/user.ts`

## Dashboard Structure

Both dashboards contain:

- Summary cards.
- Insights.
- Snapshot Status.
- Main tabs:
  - Metrics
  - Data sharing
  - Signals
  - Trends
  - Events
- Right-side filters panel with collapse/hide support.

The Control Plane and HTTP Data Plane dashboards are separate files and should be allowed to evolve independently.

## Current Filter Behavior

Filters are on the right side of the screen and can be hidden.

Current filters include:

- Bucket
- Signal
- Metric
- Participant A
- Participant B
- Date range
- Status
- Dataset
- Artefact Type
- Artefact Reference
- Artefact Version

Filter panel refinements already done:

- Filter panel is right-side, not overlay.
- Page layout dynamically adjusts when filters are open.
- Panel width reduced to roughly the right-side tab width.
- Filter controls stack vertically instead of cramming options into rows.
- Refresh snapshots and last uploaded/status information moved outside the filter panel.
- Date range starts at `Jan 1 2020`.
- Date range uses a dual-handle slider.
- Date range also has a calendar picker.
- Date labels show day, month name, and year only. No time.
- Duplicate bottom date range label was removed.
- Filter panel height/position stabilized so it does not jump while moving slider handles.

## Trend Drilldown Behavior

The Trends tab has a `Trend Drilldown` card.

Current behavior:

- Clicking a metric opens a metric trend graph.
- Clicking a signal/event type opens a signal trend graph.
- Clicking an artefact opens an artefact trend graph.
- Selecting a Metric filter also opens the metric trend graph.
- Selecting a Signal filter also opens the signal trend graph.
- Selecting Artefact filters also opens the artefact trend graph.
- The graph no longer asks the user to choose again when the filter already identifies the selected metric/signal/artefact.
- `Clear drilldown` clears active metric, signal, and artefact drilldown filters.
- Clicking one drilldown type clears incompatible drilldown filters from the other types.

Important state names in the Vue files:

- `selectedArtefact`
- `selectedMetricName`
- `selectedSignalName`
- `activeMetricName`
- `activeSignalName`
- `activeArtefact`
- `hasActiveTrendDrilldown`
- `selectedTrendTitle`
- `selectedTrendCount`
- `selectedTrendEvents`
- `selectedTrendChartKey`
- `selectedTrendChart`

## Trend Chart Layout Fixes

The chart had an issue where the first click rendered out of proportion and later clicks rendered correctly.

Current fixes:

- Chart has a fixed compact height of `13.5rem`.
- PrimeVue chart wrapper and canvas are both constrained to the same height.
- Chart is keyed by selected drilldown and date range so it recreates cleanly when the selection changes.
- Y-axis is fixed from `0` to `100`.
- Rate/coverage/score metric values are converted from decimals to percentages for trend display.
- X-axis uses the selected date range as a fixed time range.
- X-axis has fewer date ticks to avoid crowding.
- Legend is hidden to preserve chart height.
- Padding is added so axis labels and baseline remain visible.

## Insights Behavior

On initial dashboard load:

- Show all generated insights for the loaded filter/date scope.

When a focused metric/signal/artefact selection is active:

- Hide unrelated insights.
- Show only insights related to the active focused selection.

Implemented with:

- `visibleInsights`
- `insightMatchesActiveSelection`
- `insightMatchesMetric`
- `insightMatchesSignal`
- `insightMatchesArtefact`

Important implementation detail:

- The backend insight evidence currently does not directly include `metricName` or `eventType`.
- UI filtering maps metric/signal selections to related insight kinds and evidence.
- Artefact filtering matches insight evidence fields:
  - `artefactReference`
  - `artefactVersion`

Current generated insight kinds from `libs/semantic-observability/src/insights.ts`:

- `validation-version-hotspot`
- `validation-dataset-hotspot`
- `failure-category-hotspot`
- `low-metadata-completeness`
- `unused-artefact`

Current metric-to-insight mapping in the UI:

- Coverage/completeness metrics map to low metadata completeness and unused artefact insights.
- Validation error rate maps to validation hotspot and failure-category insights.
- Failure/success/latency metrics map to failure-category insights.
- Artefact adoption/deprecated usage maps to artefact-related insights.

Current signal-to-insight mapping in the UI:

- Metadata/catalog/configuration signals map to metadata completeness and artefact usage insights.
- Metadata validation signals map to validation hotspot and failure-category insights.
- Policy, negotiation, transfer, and data-plane access signals map to failure-category insights.

## Existing Dashboard Revert Note

The user asked to avoid changing the existing TSG dashboard design.

Created:

- `REVERTED_EXISTING_DASHBOARD_CHANGES.md`

Use that file if we need to understand what was reverted and how to reapply those changes later.

## Picture Folder

Screenshots are stored in:

- `pictures/`

Known files:

- `pictures/Link 5174.png`
- `pictures/Pic 001.png`
- `pictures/Pic1.png`

`Pic1.png` has been used several times to verify:

- Right-side filters.
- Trend chart layout.
- Metric filter versus trend graph behavior.

## Recent Validation Commands

The package manager is available through Corepack in this environment.

Use:

```powershell
corepack pnpm --filter @apps/control-plane-ui type-check
corepack pnpm --filter @apps/http-data-plane-ui type-check
```

Both were passing after the latest changes.

Direct `pnpm` may not be available on PATH in this shell; use `corepack pnpm`.

## Current Known Caveats

- Insight filtering by metric/signal is currently UI-side mapping because backend insight evidence does not yet include `metricName` or `eventType`.
- A stronger next step would be to extend `SemanticObservabilityInsightEvidence` with fields such as:
  - `metricName`
  - `eventType`
  - `component`
  - `artefactType`
- After that, the frontend can filter insights by direct evidence instead of inferred insight-kind mappings.
- Trend charts use fixed `0..100` y-axis as requested. Count-based signal/artefact trends may appear low on the chart when counts are small. This is intentional based on the user request that the range should stay fixed.

## Suggested Next Work

Possible next tasks:

- Add explicit metric/signal evidence to generated insights.
- Add insight drilldown details, such as the events behind each insight.
- Add backend-side filtered insight generation for active metric/signal/artefact selections.
- Add tests for insight filtering/mapping.
- Validate both dashboards visually in browser after starting the UI/API dev servers.

