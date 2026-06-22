# Semantic Observability Flow

This document explains how the semantic observability demo works, what is required to run it, how events and snapshots are produced, and where data is stored.

## Purpose

The semantic observability component gives visibility into semantic metadata quality, adoption, friction, evolution, and stability without exposing raw business payloads.

It is implemented as a passive listener around normal TSG workflows. The component records sanitized observability events and turns them into aggregate reports and metric snapshots.

## Demo Components

The Docker demo runs two TSG components:

- Alfa Control Plane
- Alfa HTTP Data Plane

Each component has:

- its own API
- its own embedded UI
- its own local database
- its own semantic observability event and snapshot storage

The Control Plane can also call the registered Data Plane management API and build combined observability reports.

## What A Client Needs

For the Docker demo, the client needs:

- Docker Desktop installed and running
- PowerShell
- the repository cloned or downloaded
- local ports `3501` and `3502` available

The client does not need local Node.js, pnpm, Vite, or manual build steps.

## Docker Runtime

The demo is started with:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml up --build -d
```

The containers expose:

```text
Control Plane API and UI:       http://localhost:3501
HTTP Data Plane API and UI:     http://localhost:3502
Control Plane observability UI: http://localhost:3501/semantic-observability
HTTP Data Plane observability:  http://localhost:3502/semantic-observability
```

`localhost` means the machine where Docker is running. If the demo runs on a remote VM or server, the client must use that server's IP address or DNS name instead of `localhost`.

Inside Docker, services communicate through Docker service names:

```text
alfa-data-plane -> alfa-control-plane
```

From the browser, users access the mapped host ports:

```text
localhost:3501
localhost:3502
```

## Startup Flow

1. Docker Compose starts the Control Plane container.
2. The Control Plane opens its API/UI on container port `3000`, mapped to host port `3501`.
3. Docker waits for the Control Plane health check to pass.
4. Docker Compose starts the HTTP Data Plane container.
5. The HTTP Data Plane opens its API/UI on container port `3000`, mapped to host port `3502`.
6. The HTTP Data Plane registers itself with the Control Plane.
7. The Data Plane pushes its catalog metadata to the Control Plane.
8. Both planes can now record semantic observability events.

## Observability Event Flow

Semantic observability begins with normal platform activity. Examples:

- catalog metadata is created or observed
- data-plane dataset configuration is updated
- policy evaluation runs
- negotiation or transfer state changes
- data-plane access is observed

The observer services convert these activities into sanitized semantic observability events.

Events are stored in:

```text
semantic_observability_event
```

The events include fields such as:

- timestamp
- component
- event type
- dimensions
- status
- sanitized context
- semantic artefact references
- failure category
- duration
- metadata completeness score

The events do not store raw dataset payloads.

## Snapshot Flow

Snapshots are aggregate metric records built from the raw observability events.

The snapshot refresh flow is:

1. Read semantic observability events from `semantic_observability_event`.
2. Apply the selected filter and bucket.
3. Build aggregate metrics for adoption, friction, evolution, and stability.
4. Remove overlapping snapshots for the same filter/time window.
5. Save the new metric snapshots.

Snapshots are stored in:

```text
semantic_observability_metric_snapshot
```

Snapshots can be refreshed manually from the UI, from the API, or through the configured automatic refresh interval.

In the Docker demo, the configured interval is:

```yaml
semanticObservability:
  enabled: true
  refreshIntervalInMilliseconds: 3600000
```

That means automatic snapshot refresh is enabled and runs approximately every hour. The smoke demo also triggers snapshot refresh manually.

## Snapshot Buckets

The current implementation supports:

- `hour`
- `day`

Hourly snapshots are useful for demos and short validation sessions. Daily snapshots are more suitable for longer-running environments.

## Storage Model

The storage model is distributed.

The Control Plane stores its own semantic observability data:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

The HTTP Data Plane stores its own semantic observability data:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

The Control Plane does not directly write Data Plane observability records into the Control Plane database. Instead, it fetches aggregate Data Plane observability data through the Data Plane management API when combined reporting is requested.

## Docker Demo Database Locations

In the Docker demo, both components use SQLite.

Control Plane config:

```yaml
db:
  type: sqlite
  database: "alfa-control-plane.db"
```

HTTP Data Plane config:

```yaml
db:
  type: "sqlite"
  database: "alfa-data-plane.db"
```

Because these paths are relative inside each container, the SQLite files live inside the container filesystem.

The demo intentionally does not use persistent Docker volumes for these databases. This makes the demo easy to reset and avoids leaving stale data between client test runs.

## Combined Reporting

The Control Plane exposes local and combined observability endpoints.

Local Control Plane observability reads only Control Plane records.

Combined observability does this:

1. Read local Control Plane events or snapshots.
2. Discover registered Data Planes.
3. Call each Data Plane management observability endpoint.
4. Merge Control Plane and Data Plane results.
5. Return a combined report to the UI/API caller.

This keeps Data Plane observability data owned by the Data Plane while still giving the user a unified dashboard.

## API Shape

Control Plane observability is exposed under:

```text
http://localhost:3501/api/management/semantic-observability
```

HTTP Data Plane observability is exposed under:

```text
http://localhost:3502/api/management/semantic-observability
```

Important endpoint groups:

```text
events
report
report/snapshots
report/snapshots/status
report/snapshots/refresh
combined/events
combined/report
combined/report/snapshots
combined/report/snapshots/status
combined/report/snapshots/refresh
```

The UI uses these management APIs to render the observability dashboard.

## Smoke Demo Flow

The smoke demo script is:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability\scripts\run-smoke-demo.ps1
```

The script:

1. Checks Control Plane and Data Plane health.
2. Updates the Data Plane dataset configuration.
3. Refreshes Data Plane registration and catalog synchronization.
4. Adds demo catalog metadata to the Control Plane.
5. Attempts a synthetic policy evaluation.
6. Refreshes combined semantic observability snapshots.
7. Prints recent combined events.
8. Prints recent Data Plane events.
9. Prints combined report metric counts.

The synthetic policy evaluation may be skipped or return a controlled error because it does not create a real stored agreement from a full two-party transfer flow. That is acceptable for this demo.

## Client Dataset Testing Flow

Clients can replace the default demo dataset metadata with their own dataset metadata and backend API.

The example client dataset config is:

```text
demo/semantic-observability/client-data/dataset-config.example.json
```

The loader script is:

```text
demo/semantic-observability/scripts/load-client-dataset.ps1
```

The client updates the JSON config with their own:

- dataset title and description
- landing page
- semantic model references
- backend API URL
- media type
- schema reference
- OpenAPI spec reference
- optional extra DCAT properties

Then they run:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability\scripts\load-client-dataset.ps1 `
  -DatasetConfig .\demo\semantic-observability\client-data\dataset-config.example.json `
  -RefreshSnapshots
```

The loader script:

1. Validates that the dataset config is valid JSON.
2. Checks Control Plane and Data Plane health.
3. Sends the dataset config to the HTTP Data Plane management API.
4. Refreshes Data Plane registration and catalog synchronization.
5. Optionally refreshes combined hourly snapshots.
6. Prints recent combined observability events.
7. Prints current combined report metric counts.

For public client APIs, `backendUrl` can be a normal public `https://...` URL.

For a backend API running on the client's same laptop, `backendUrl` must use Docker's host gateway name:

```text
http://host.docker.internal:<port>
```

For example:

```json
"backendUrl": "http://host.docker.internal:8080/api/data"
```

Using `http://localhost:<port>` inside the dataset config would point to the Data Plane container itself, not to the client's host machine.

## Why Distributed Storage Is Acceptable

The distributed model is acceptable for the current demo and MVP because:

- each plane owns the events it generated
- raw observability events stay local to the producing component
- combined reporting can use aggregate data instead of centralizing everything
- the privacy story is clearer
- local Docker reset is simple
- the Control Plane can still present a unified observability dashboard

## Production Considerations

For production, the storage decision should be made explicitly.

Recommended production topics:

- use Postgres instead of demo SQLite
- add durable volumes or managed database storage
- define retention policy for raw events and snapshots
- decide whether combined reports should be live-fetched or periodically centralized
- add export/report generation if clients need audit evidence
- define backup and restore expectations
- define access controls for observability APIs
- define whether Data Plane observability data can leave the Data Plane boundary

The current Docker demo is intentionally optimized for client validation, resetability, and low setup friction.
