# TSG Semantic Observability Docker Demo

This demo starts a minimal TSG setup for client-side validation of semantic observability:

- Alfa Control Plane
- Alfa HTTP Data Plane
- embedded Control Plane UI
- embedded HTTP Data Plane UI

The observability component is a passive listener. It records sanitized, privacy-safe events from normal TSG workflows and exposes aggregate evidence in the management API and UI.

## Prerequisites

- Docker Desktop
- PowerShell

No local Node.js, pnpm, or Vite setup is required for this Docker path.

## Start

From the repository root:

```powershell
.\demo\semantic-observability\scripts\start.ps1
```

Or directly with Docker Compose:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml up --build -d
```

## Open

```text
Control Plane API and UI:       http://localhost:3501
HTTP Data Plane API and UI:     http://localhost:3502
Control Plane observability UI: http://localhost:3501/semantic-observability
HTTP Data Plane observability:  http://localhost:3502/semantic-observability
```

## Run Evidence Script

```powershell
.\demo\semantic-observability\scripts\run-smoke-demo.ps1
```

The script:

- checks both services
- updates the HTTP Data Plane dataset configuration
- refreshes Data Plane registration/catalog synchronization
- adds a demo catalog dataset through the Control Plane management API
- refreshes combined observability snapshots
- prints recent combined and HTTP Data Plane listener events
- prints current aggregate metric counts

Policy evaluation may be skipped in this smoke demo because a synthetic agreement is not a real stored agreement from a full two-party flow.

## Test With Client Data

Copy and edit the example dataset config:

```text
demo/semantic-observability/client-data/dataset-config.example.json
```

Load it into the running HTTP Data Plane:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability\scripts\load-client-dataset.ps1 `
  -DatasetConfig .\demo\semantic-observability\client-data\dataset-config.example.json `
  -RefreshSnapshots
```

If the backend API runs on the same machine as Docker Desktop, use `host.docker.internal` in `backendUrl`, for example:

```json
"backendUrl": "http://host.docker.internal:8080/api/data"
```

## Reset

```powershell
.\demo\semantic-observability\scripts\reset.ps1
```

This stops containers and removes demo volumes/databases.

## Docker Notes

The existing project Dockerfiles are used:

- `Dockerfile-control-plane`
- `Dockerfile-http-data-plane`

Each image embeds its UI into the API container. This is why the demo uses ports `3501` and `3502` only; there are no separate Vite UI ports.
