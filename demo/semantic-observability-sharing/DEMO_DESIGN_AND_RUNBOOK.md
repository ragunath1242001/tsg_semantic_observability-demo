# Semantic Observability Sharing Demo Design And Runbook

## Purpose

This demo shows semantic observability during a real TSG two-party data-sharing flow.

The goal is to prove that the semantic observability layer can listen to normal dataspace operations and produce useful evidence without storing raw business payloads. The demo records sanitized events from catalog discovery, contract negotiation, policy evaluation, transfer setup, and HTTP data-plane access.

This is the preferred validation demo because it exercises an actual provider/consumer exchange instead of only synthetic events.

## Demo Architecture

The demo starts four TSG services:

| Service | Role | URL | Observability UI |
| --- | --- | --- | --- |
| Alfa Control Plane | Provider control plane | `http://localhost:3701` | `http://localhost:3701/semantic-observability` |
| Alfa HTTP Data Plane | Provider data plane | `http://localhost:3702` | `http://localhost:3702/semantic-observability` |
| Bravo Control Plane | Consumer control plane | `http://localhost:3801` | `http://localhost:3801/semantic-observability` |
| Bravo HTTP Data Plane | Consumer data plane | `http://localhost:3802` | `http://localhost:3802/semantic-observability` |

Alfa acts as the dataset provider. Bravo acts as the dataset consumer.

Each component has:

- Its own API.
- Its own embedded UI.
- Its own SQLite database inside the container.
- Its own semantic observability event and snapshot tables.

The control planes can also call their registered data planes and build combined observability reports.

## Files In This Demo

Main demo files:

```text
demo/semantic-observability-sharing/docker-compose.yml
demo/semantic-observability-sharing/README.md
demo/semantic-observability-sharing/DEMO_DESIGN_AND_RUNBOOK.md
demo/semantic-observability-sharing/scripts/run-sharing-flow.ps1
demo/semantic-observability-sharing/scripts/reset.ps1
```

Configuration files:

```text
demo/semantic-observability-sharing/configs/alfa-control-plane.yaml
demo/semantic-observability-sharing/configs/alfa-data-plane.yaml
demo/semantic-observability-sharing/configs/bravo-control-plane.yaml
demo/semantic-observability-sharing/configs/bravo-data-plane.yaml
```

The Docker Compose file builds and runs the control-plane and HTTP data-plane images from the repository Dockerfiles:

```text
Dockerfile-control-plane
Dockerfile-http-data-plane
```

## Embedded UI Setup

The demo images embed the frontend build into each API container.

The control-plane containers use:

```yaml
EMBEDDED_FRONTEND: /app/control-plane-ui
```

The HTTP data-plane containers use:

```yaml
EMBEDDED_FRONTEND: /app/http-data-plane-ui
```

This is required because the Nest static-file server expects `EMBEDDED_FRONTEND` to be an absolute path. If it is set to `"true"`, the API stays healthy but dashboard routes return HTTP 500 because Express cannot serve a relative path with `res.sendFile`.

## Ports

The demo uses these host ports:

| Port | Service |
| --- | --- |
| `3701` | Alfa Control Plane |
| `3702` | Alfa HTTP Data Plane |
| `3801` | Bravo Control Plane |
| `3802` | Bravo HTTP Data Plane |

If any port is already in use, change the host-side port in `docker-compose.yml`.

## Prerequisites

Required:

- Docker Desktop running.
- PowerShell.
- Repository available locally.

No local Node.js, pnpm, or Vite setup is required for this Docker demo.

## Start The Demo

From the repository root:

```powershell
cd F:\Project\tno-security-gateway
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml up --build -d
```

This builds the images if needed and starts all four services.

Check container status:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml ps
```

All four services should show `healthy`.

## Run The Sharing Flow

After the containers are healthy, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

The script performs the complete sharing scenario.

## What The Flow Does

The script executes this sequence:

1. Checks health for Alfa Control Plane, Alfa Data Plane, Bravo Control Plane, and Bravo Data Plane.
2. Bravo requests Alfa's catalog.
3. Bravo selects Alfa's published dataset and offer.
4. Bravo starts a contract negotiation.
5. Alfa agrees to the negotiation.
6. Bravo verifies the agreement.
7. Alfa finalizes the agreement.
8. Bravo requests a `tsg:HTTP` transfer.
9. Alfa and Bravo data planes create transfer records.
10. Bravo Data Plane executes an HTTP request through Alfa Data Plane's provider proxy.
11. Both control planes refresh combined semantic observability snapshots.
12. The script prints recent semantic observability events from Alfa and Bravo.
13. The script prints the UI links.

## Runtime Data Flow

The operational data-sharing path is:

```text
Bravo Control Plane
  -> requests Alfa catalog
  -> creates negotiation
  -> receives finalized agreement
  -> requests transfer

Bravo HTTP Data Plane
  -> executes data access request
  -> calls Alfa HTTP Data Plane provider proxy

Alfa HTTP Data Plane
  -> proxies request to configured backend
  -> returns backend response
```

The provider backend is configured in:

```text
demo/semantic-observability-sharing/configs/alfa-data-plane.yaml
```

The current demo backend uses a public mock HTTP endpoint.

## Observability Event Flow

The semantic observability layer is passive. It does not drive the sharing flow. It observes workflow metadata after normal TSG operations happen.

Events are recorded by:

- Control Plane observer services.
- HTTP Data Plane observer services.

Control-plane events include:

- `catalog.metadata.observed`
- `policy.evaluation.result`
- `negotiation.state.changed`
- `transfer.state.changed`

HTTP data-plane events include:

- `dataset.configuration.observed`
- `transfer.state.changed`
- `data-plane.access.observed`

Events are grouped by dimensions:

- `adoption`: semantic metadata, models, schemas, and artefacts are being used.
- `friction`: validation, policy, negotiation, transfer, or access problems.
- `evolution`: semantic artefact and version usage over time.
- `stability`: successful and reliable negotiations, transfers, and accesses.

## What Is Stored

Each component stores its own observability records.

Control planes store:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

HTTP data planes store:

```text
semantic_observability_event
semantic_observability_metric_snapshot
```

The control plane does not directly write data-plane observability events into its own database. For combined dashboards, it calls the registered data-plane management APIs and merges the returned events or reports.

## Privacy Design

The observability layer is designed to avoid raw business payload persistence.

Privacy behavior:

- Dataset identifiers are pseudonymized.
- Participant identifiers are pseudonymized.
- Negotiation IDs are pseudonymized.
- Agreement IDs are pseudonymized.
- Transfer IDs are pseudonymized.
- Semantic artefact references are pseudonymized.
- Sensitive attributes such as tokens, payloads, body content, authorization values, and raw errors are redacted.
- Backend response bodies are not stored in observability events.

This means the dashboard provides evidence about interoperability behavior, not raw exchanged data.

## Metrics Available

The semantic observability report can include:

- Semantic model coverage.
- Schema reference coverage.
- Metadata completeness score.
- Validation error rate.
- Policy failure count.
- Negotiation success rate.
- Negotiation failure rate.
- Transfer success rate.
- Transfer failure rate.
- Data-plane access success rate.
- Data-plane access failure rate.
- Average transfer setup latency.
- Artefact version adoption rate.
- Deprecated artefact usage rate.

Snapshots can be refreshed by hour or day.

The sharing script refreshes hourly combined snapshots.

## Dashboard Views

Open these dashboards after running the flow:

```text
http://localhost:3701/semantic-observability
http://localhost:3702/semantic-observability
http://localhost:3801/semantic-observability
http://localhost:3802/semantic-observability
```

Control-plane dashboards show control-plane evidence and can include combined control-plane plus data-plane evidence.

HTTP data-plane dashboards show local data-plane evidence, including dataset configuration, transfer state, and access events.

Dashboard sections include:

- Metrics.
- Data sharing.
- Signals.
- Trends.
- Events.

## Management API Endpoints

Control Plane semantic observability API:

```text
http://localhost:3701/api/management/semantic-observability
http://localhost:3801/api/management/semantic-observability
```

HTTP Data Plane semantic observability API:

```text
http://localhost:3702/api/management/semantic-observability
http://localhost:3802/api/management/semantic-observability
```

Useful endpoint examples:

```text
GET  /api/management/semantic-observability/events
GET  /api/management/semantic-observability/report
GET  /api/management/semantic-observability/insights
GET  /api/management/semantic-observability/report/snapshots
GET  /api/management/semantic-observability/report/snapshots/status
POST /api/management/semantic-observability/report/snapshots/refresh
```

Control-plane combined endpoint examples:

```text
GET  /api/management/semantic-observability/combined/events
GET  /api/management/semantic-observability/combined/report
GET  /api/management/semantic-observability/combined/insights
GET  /api/management/semantic-observability/combined/report/snapshots
POST /api/management/semantic-observability/combined/report/snapshots/refresh
```

## Reset The Demo

To stop and remove the demo containers and local demo state:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\reset.ps1
```

Then start again with:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml up --build -d
```

## Troubleshooting

### Docker Engine Not Running

If Docker commands fail with a Docker API or pipe error, start Docker Desktop and retry:

```powershell
docker info
```

### Containers Are Not Healthy

Check status:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml ps
```

Check logs:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml logs --tail 120 alfa-control-plane
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml logs --tail 120 alfa-data-plane
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml logs --tail 120 bravo-control-plane
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml logs --tail 120 bravo-data-plane
```

### Dashboard Returns HTTP 500

Check `EMBEDDED_FRONTEND` in `docker-compose.yml`.

Correct values:

```yaml
EMBEDDED_FRONTEND: /app/control-plane-ui
EMBEDDED_FRONTEND: /app/http-data-plane-ui
```

Incorrect value:

```yaml
EMBEDDED_FRONTEND: "true"
```

After changing the compose file, recreate containers:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml up -d --force-recreate
```

### Dashboard Opens But Has No Events

Run the sharing flow again:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

Then refresh the dashboard.

### API Works But UI Does Not

Check API directly:

```powershell
Invoke-WebRequest -Uri http://localhost:3701/api/management/semantic-observability/combined/events?take=5 -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:3702/api/management/semantic-observability/events?take=5 -UseBasicParsing
```

If these return `200`, the observability backend is working and the issue is likely frontend serving or browser-side routing.

## Section-Wise Short Summary

### What We Built

We built a two-party TSG semantic observability demo with Alfa as provider and Bravo as consumer. It runs real catalog, negotiation, transfer, and data access workflows while semantic observability records privacy-safe evidence.

### What Services Are Available

The demo provides four services: Alfa Control Plane, Alfa HTTP Data Plane, Bravo Control Plane, and Bravo HTTP Data Plane. Each service has its own API, UI, database, and observability storage.

### What The Demo Runs

The sharing script checks health, fetches Alfa's catalog from Bravo, negotiates an agreement, requests a transfer, executes HTTP data access through the data planes, refreshes observability snapshots, and prints recent events.

### What Observability Records

The demo records catalog metadata observations, dataset configuration observations, policy evaluation results, negotiation state changes, transfer state changes, and data-plane access observations.

### What Metrics Are Available

The dashboard and APIs expose adoption, friction, evolution, and stability metrics, including semantic model coverage, schema coverage, metadata completeness, policy failures, negotiation success, transfer success, data-plane access success, and artefact version adoption.

### What Privacy Controls Are Used

Identifiers and artefact references are pseudonymized, sensitive attributes are redacted, and raw business payloads are not stored in events or snapshots.

### What Dashboards Are Available

The demo exposes four dashboards: Alfa Control Plane, Alfa Data Plane, Bravo Control Plane, and Bravo Data Plane. The control-plane dashboards can show combined evidence across registered data planes.

### What Commands Matter

Start the demo:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml up --build -d
```

Run the flow:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

Reset the demo:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\reset.ps1
```

### What Is Available After Running

After the flow runs, the dashboards show semantic observability events, grouped signals, metrics, trends, snapshots, and insights for the provider and consumer sides of the data-sharing exchange.
