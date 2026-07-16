# Distributed SDO Semantic Observability Handover

## Current Status

This distributed multi-machine participant setup is parked and is not the active approach.

The active direction is the centralized SDO dashboard/UI with a local Alfa/Bravo demo running on one machine. This avoids exposing participant Control Plane or Data Plane ports to other systems:

```text
sdo-semantic-observability
  central SDO collector and dashboard on http://localhost:4100

tno-security-gateway/demo/semantic-observability-sharing
  local Alfa and Bravo TSG services
  sanitized events exported to the central SDO dashboard
```

Use this instead:

```powershell
cd F:\Project\tno-security-gateway
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1 -Build
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

For a hosted SDO dashboard, for example in GCP, use:

```powershell
cd F:\Project\tno-security-gateway
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1 `
  -ExternalSdo `
  -SdoUrl https://sdo.example.com `
  -Build
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

In hosted mode, each system runs its own local Alfa/Bravo demo and sends outbound semantic observability events to the central SDO dashboard. It does not expose participant ports or perform cross-system TSG sharing.

The distributed template below is retained as historical/reference material only. Do not treat it as the current implementation plan unless the project explicitly returns to multi-machine deployments.

## Goal

Build a distributed semantic observability demo where independent TSG participants can share data with each other while a central SDO dashboard observes the semantic interoperability process.

Target architecture:

```text
Participant machine A
  TSG Control Plane
  TSG HTTP Data Plane
  exports sanitized semantic observability events

Participant machine B
  TSG Control Plane
  TSG HTTP Data Plane
  exports sanitized semantic observability events

Central SDO machine/server
  SDO collector API
  participant registry
  central event store
  central dashboard
```

The SDO dashboard is not part of the data-sharing transaction. It only receives sanitized observability evidence from registered participants.

## Design Decisions

- The SDO dashboard is a separate folder outside `tno-security-gateway`:
  - `F:\Project\sdo-semantic-observability`
- Participant systems run `tno-security-gateway`.
- Participant IDs are not manually invented.
- The SDO service registers participants and returns:
  - unique `participantId`
  - participant-specific `apiKey`
  - ingestion endpoint
- One SDO registration represents one participant system.
- A participant's Control Plane and Data Plane both export with the same `PARTICIPANT_ID`.
- The event `component` field distinguishes `control-plane` from `http-data-plane`.
- Events exported to the SDO are already sanitized by the participant-side semantic observability layer.

## Completed Work

### 1. Central SDO Service

Created:

```text
F:\Project\sdo-semantic-observability
```

Main files:

```text
sdo-semantic-observability/src/server.js
sdo-semantic-observability/src/storage.js
sdo-semantic-observability/src/semantic.js
sdo-semantic-observability/src/participants.js
sdo-semantic-observability/public/index.html
sdo-semantic-observability/public/app.js
sdo-semantic-observability/public/styles.css
sdo-semantic-observability/docker-compose.yml
sdo-semantic-observability/README.md
```

The SDO service currently provides:

- central event ingestion
- semantic report aggregation
- transaction grouping
- dashboard UI
- auto-refresh every 5 seconds
- participant registration
- participant-specific API key authentication
- registered participant visibility in dashboard
- JSONL local/dev storage
- Postgres storage for Docker Compose and long-running distributed runs

Current SDO APIs:

```text
GET  /api/health
POST /api/participants/register
GET  /api/participants
GET  /api/participants/me
POST /api/ingest/events
GET  /api/events
GET  /api/report
GET  /api/transactions
```

Ingest authentication now requires:

```text
X-SDO-Participant-Id: <participantId>
X-SDO-API-Key: <apiKey>
```

### 2. TSG Participant-Side Exporter

Added optional SDO export config to both APIs:

```text
apps/control-plane-api/src/config.ts
apps/http-data-plane-api/src/config.ts
```

Added exporter services:

```text
apps/control-plane-api/src/semantic-observability/semantic-observability-sdo-exporter.service.ts
apps/http-data-plane-api/src/semantic-observability/semantic-observability-sdo-exporter.service.ts
```

Wired exporter into local event recording:

```text
apps/control-plane-api/src/semantic-observability/semantic-observability.service.ts
apps/http-data-plane-api/src/semantic-observability/semantic-observability.service.ts
```

Behavior:

```text
TSG workflow happens
  -> local semantic observer records event
  -> event is sanitized
  -> event is saved locally
  -> sanitized event is pushed to SDO if sdoExport.enabled=true
```

Exporter failures are non-blocking. If the SDO collector is down, participant workflows should continue.

### 3. Distributed Participant Template

Created:

```text
demo/distributed-sdo/
```

Main files:

```text
demo/distributed-sdo/README.md
demo/distributed-sdo/participant/.env.example
demo/distributed-sdo/participant/docker-compose.yml
demo/distributed-sdo/participant/configs/control-plane.template.yaml
demo/distributed-sdo/participant/configs/data-plane.template.yaml
```

Scripts:

```text
demo/distributed-sdo/participant/scripts/common.ps1
demo/distributed-sdo/participant/scripts/register-participant.ps1
demo/distributed-sdo/participant/scripts/check-sdo.ps1
demo/distributed-sdo/participant/scripts/send-test-event.ps1
demo/distributed-sdo/participant/scripts/generate-config.ps1
demo/distributed-sdo/participant/scripts/start.ps1
demo/distributed-sdo/participant/scripts/reset.ps1
demo/distributed-sdo/participant/scripts/check-health.ps1
demo/distributed-sdo/participant/scripts/run-consumer-flow.ps1
```

The template supports any participant machine by using a local `.env`.

The registration script:

- calls SDO `/api/participants/register`
- receives unique participant ID and API key
- writes `.env`
- writes unique `COMPOSE_PROJECT_NAME`

The config generation script:

- reads `.env`
- renders Control Plane and Data Plane config files into:

```text
demo/distributed-sdo/participant/configs/generated/
```

The start script:

- generates configs
- starts the participant Control Plane and Data Plane with Docker Compose

The preflight script:

- validates SDO health
- validates participant credentials
- sends one synthetic sanitized test event

### 4. Distributed Consumer Flow

Updated:

```text
demo/distributed-sdo/participant/scripts/run-consumer-flow.ps1
```

The script now:

- checks local consumer health
- checks remote provider health
- requests provider catalog
- starts negotiation from consumer
- finds provider negotiation remotely
- calls provider agreement
- verifies on consumer
- calls provider finalize
- requests transfer
- executes data access through consumer Data Plane
- refreshes observability snapshots
- prints recent events

This requires the provider Control Plane management API to be reachable from the consumer machine.

## Validation Completed

Validated SDO syntax:

```powershell
node --check .\src\server.js
node --check .\src\participants.js
node --check .\public\app.js
```

Validated TSG builds:

```powershell
corepack pnpm --filter @apps/control-plane-api build
corepack pnpm --filter @apps/http-data-plane-api build
```

Validated participant template:

```powershell
docker compose --env-file .\.env.example -f .\docker-compose.yml config --quiet
```

Validated participant scripts:

```text
All 9 participant PowerShell scripts parsed successfully.
```

Validated SDO registration and ingestion:

```text
registered participant
checked credentials
sent test event
SDO accepted 1 event
/api/events total = 1
```

Validated config generation:

```json
{
  "ControlPlaneSdoExport": "participantId: participant_test123",
  "DataPlaneSdoExport": "participantId: participant_test123",
  "UnresolvedPlaceholders": 0
}
```

## Current Run Flow

### SDO Machine

```powershell
cd F:\Project\sdo-semantic-observability
docker compose up --build -d
```

Open:

```text
http://<SDO_HOST>:4100
```

### Participant Machine

```powershell
cd <repo>\demo\distributed-sdo\participant

powershell -ExecutionPolicy Bypass -File .\scripts\register-participant.ps1 `
  -SdoUrl http://<SDO_HOST>:4100 `
  -DisplayName "Participant 01" `
  -PublicHost <THIS_MACHINE_IP> `
  -ControlPlanePort 3701 `
  -DataPlanePort 3702

powershell -ExecutionPolicy Bypass -File .\scripts\check-sdo.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\send-test-event.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Build
```

For a consumer participant, edit `.env`:

```env
PARTICIPANT_ROLE=consumer
REMOTE_CONTROL_PLANE_API=http://<PROVIDER_HOST>:<PROVIDER_CONTROL_PLANE_PORT>/api
REMOTE_PARTICIPANT_AUDIENCE=did:web:<PROVIDER_PARTICIPANT_ID>
```

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-consumer-flow.ps1
```

## Important Notes

- Do not use `localhost` for distributed machine-to-machine URLs.
- Use reachable IP addresses, DNS names, or `host.docker.internal` only for local single-machine testing.
- Direct local SDO runs default to JSONL storage.
- SDO Docker Compose runs use Postgres storage by default.
- Open firewall ports:
  - participant Control Plane port
  - participant Data Plane port
  - SDO port `4100`
- Do not reuse `.env` files between participants.
- Do not commit generated `.env` or `configs/generated/*`.

## Next Steps

1. Test the distributed template locally with two copied participant folders:

```text
demo/distributed-sdo/participant-01
demo/distributed-sdo/participant-02
```

2. Start the SDO dashboard locally.

3. Register both local participants.

4. Start both participant stacks on different ports.

5. Run `run-consumer-flow.ps1` from participant 02.

6. Confirm the SDO dashboard shows both participants and the data-sharing events.

7. After local two-participant test works, repeat on two real machines plus one SDO machine/server.

8. If the flow fails during negotiation or transfer, inspect:

```powershell
docker compose --env-file .\.env -f .\docker-compose.yml logs --tail 120 control-plane
docker compose --env-file .\.env -f .\docker-compose.yml logs --tail 120 data-plane
```

9. Later hardening:

- add SDO admin authentication
- add participant revocation
- add TLS/reverse proxy deployment instructions
- add dashboard filters by participant pair and transaction

## Postgres Storage Milestone

Added to `F:\Project\sdo-semantic-observability`:

```text
migrations/001_init.sql
src/storage.js
docker-compose.yml
Dockerfile
package.json
README.md
```

Current behavior:

```text
node src/server.js
  -> JSONL storage fallback

docker compose up --build -d
  -> Postgres storage
```

Postgres tables:

```text
sdo_participant
semantic_observability_event
semantic_observability_metric_snapshot
semantic_observability_transaction
```

Next validation for this milestone:

```text
docker compose up --build -d
register participant
send test event
restart SDO service
confirm participant and event still appear
```
