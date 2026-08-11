# Semantic Observability Sharing Demo

This is the primary SDO semantic observability demo.

It runs Alfa and Bravo on the same machine, exports sanitized semantic observability events from both local TSG participants, and shows those events in one central SDO dashboard.

This keeps the focus on the central dashboard/UI. It does not require a distributed participant-to-participant setup across multiple systems.
The Docker ports are bound to `127.0.0.1`, so the demo is intended for local browser access only and does not require exposing participant ports to other machines.

It starts:

- Central SDO semantic observability dashboard and collector
- Postgres storage for the SDO collector
- Alfa Control Plane, acting as the provider control plane
- Alfa HTTP Data Plane, exposing the provider dataset
- Bravo Control Plane, acting as the consumer control plane
- Bravo HTTP Data Plane, executing the consumer-side data access

The Alfa and Bravo TSG services still run a local sharing flow so the dashboard has real semantic observability events to display. The important product surface is the central SDO dashboard at `http://localhost:4100`.

## Start

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1 -Build
```

The script starts the SDO collector, registers local Alfa and Bravo demo participants, writes their generated SDO credentials to `demo/semantic-observability-sharing/.env`, and starts the four local TSG services with SDO export enabled.

## Start Against A Hosted SDO Dashboard

If the SDO dashboard is hosted centrally, for example in GCP, keep Alfa and Bravo local and point only the exporter at the hosted SDO URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1 `
  -ExternalSdo `
  -SdoUrl https://sdo.example.com `
  -Build
```

In this mode the script does not start a local SDO container. It registers local Alfa and Bravo with the hosted SDO, writes the returned credentials to `.env`, and starts only the local TSG services.

Only outbound HTTPS from the local machine to the hosted SDO dashboard is required. The local Alfa/Bravo ports remain bound to `127.0.0.1`.

## Open The UIs

```text
Central SDO dashboard:           http://localhost:4100

Alfa Control Plane UI/API:        http://localhost:3701
Alfa Data Plane UI/API:           http://localhost:3702
Bravo Control Plane UI/API:       http://localhost:3801
Bravo Data Plane UI/API:          http://localhost:3802

Alfa Control Plane observability: http://localhost:3701/semantic-observability
Alfa Data Plane observability:    http://localhost:3702/semantic-observability
Bravo Control Plane observability:http://localhost:3801/semantic-observability
Bravo Data Plane observability:   http://localhost:3802/semantic-observability
```

`localhost` is the machine where Docker is running. The compose file binds ports to `127.0.0.1`, so other machines should not connect to this demo directly.

## Run The Local Event Flow

After the containers are healthy:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

The script performs a local Alfa/Bravo sharing path to generate real events, then publishes semantic scenario events as Alfa and Bravo to the central SDO dashboard. By default it runs all demo scenarios.

1. Checks all four services.
2. Bravo requests Alfa's catalog.
3. Bravo starts a contract negotiation for Alfa's dataset.
4. Alfa agrees, Bravo verifies, and Alfa finalizes the agreement.
5. Bravo requests a `tsg:HTTP` transfer.
6. Bravo Data Plane executes a GET request through Alfa Data Plane.
7. Scenario-specific semantic observability events are exported to SDO.
8. Both control planes refresh combined semantic observability snapshots.
9. Recent observability events are printed.

Run one scenario at a time:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario happy-path
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario missing-ontology
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario missing-schema
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario deprecated-artefact
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario validation-error
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 -Scenario version-drift
```

If Alfa and Bravo are exporting to a hosted SDO dashboard, pass the public SDO URL so the scenario events are sent to the same collector:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 `
  -Scenario all `
  -SdoUrl https://sdo-semantic-observability-32325974766.europe-west1.run.app
```

The scenarios are:

- `happy-path`: ontology, schema, versioned artefacts, and validation success.
- `missing-ontology`: schema exists but ontology/semantic model is missing.
- `missing-schema`: ontology exists but schema/OpenAPI reference is missing.
- `deprecated-artefact`: legacy/deprecated ontology and schema usage.
- `validation-error`: semantic validation failure with a failure category.
- `version-drift`: old and new ontology/schema versions observed in the same Alfa/Bravo flow.

The same sanitized events are exported to the central SDO collector. Refresh:

```text
http://localhost:4100
```

The dashboard should show Alfa and Bravo as registered participants, recent semantic observability events, grouped transactions, and aggregate metrics.
The dashboard also listens for real-time event notifications from `/api/events/stream`, so new ingested events refresh the UI quickly without waiting for the normal polling interval.

The data payload is fetched from the provider backend configured in `configs/alfa-data-plane.yaml`.

## Reset

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\reset.ps1
```

This removes the containers and demo databases. Start again with Docker Compose for a clean run.

## Ports

The demo uses these host ports:

- `4100` Central SDO dashboard and collector
- `3701` Alfa Control Plane
- `3702` Alfa Data Plane
- `3801` Bravo Control Plane
- `3802` Bravo Data Plane

If a port is already used, change the host-side port in `docker-compose.yml`. Keep the `127.0.0.1:` prefix if the demo should remain local-only.

## What Observability Records

This scenario records real workflow events, including:

- catalog and dataset metadata observations
- contract negotiation state changes
- transfer state changes
- data-plane access events from the provider and consumer data planes

Raw business payloads are not stored in semantic observability events or snapshots.

## Out Of Scope For This Demo

The earlier distributed SDO template under `demo/distributed-sdo` is parked for now. The current goal is the centralized SDO dashboard/UI with a local Alfa/Bravo demo on one machine.
