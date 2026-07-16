# Distributed SDO Demo

This demo is for a real distributed setup:

```text
SDO machine/server
  - runs central SDO semantic observability dashboard

Participant machine A
  - runs one TSG Control Plane and one HTTP Data Plane

Participant machine B
  - runs one TSG Control Plane and one HTTP Data Plane
```

The participant machines share data with each other. Each participant also pushes sanitized semantic observability events to the SDO dashboard.

## Current Scope

This folder contains the reusable participant deployment template:

```text
demo/distributed-sdo/participant/
```

Each participant machine uses the same folder and gets its own `.env` file.

## SDO Setup

On the SDO machine:

```powershell
cd F:\Project\sdo-semantic-observability
docker compose up --build -d
```

Open:

```text
http://<SDO_HOST>:4100
```

For other machines to push events, `<SDO_HOST>:4100` must be reachable from their network.

Use an address that participant machines can actually reach, for example:

```text
http://192.168.1.100:4100
http://sdo.company.local:4100
```

If the SDO machine is Windows, also allow inbound TCP traffic on port `4100` in Windows Defender Firewall or the network firewall.

## Participant Registration

On each participant machine:

```powershell
cd <repo>\demo\distributed-sdo\participant
powershell -ExecutionPolicy Bypass -File .\scripts\register-participant.ps1 `
  -SdoUrl http://<SDO_HOST>:4100 `
  -DisplayName "Participant 01" `
  -PublicHost <THIS_MACHINE_IP> `
  -ControlPlanePort 3701 `
  -DataPlanePort 3702
```

The script writes:

```text
.env
```

with the unique participant ID and API key returned by the SDO.

`-SdoUrl` is the URL used by the registration script running in PowerShell. The script stores the returned ingest endpoint in `.env` as `SDO_OBSERVABILITY_ENDPOINT`, which is used later by the TSG containers.

For real remote systems, `-SdoUrl` and `SDO_OBSERVABILITY_ENDPOINT` should both use the SDO server IP/DNS:

```env
SDO_OBSERVABILITY_ENDPOINT=http://<SDO_HOST>:4100/api/ingest/events
```

For one-machine local Docker testing only, register through `localhost` but store the container-reachable SDO URL with `-SdoExportUrl`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-participant.ps1 `
  -SdoUrl http://localhost:4100 `
  -SdoExportUrl http://host.docker.internal:4100 `
  -DisplayName "Participant 01" `
  -PublicHost host.docker.internal `
  -ControlPlanePort 3701 `
  -DataPlanePort 3702
```

Do not reuse `.env` files between participants.

One SDO registration represents one participant system. The participant's Control Plane and Data Plane both export with the same `PARTICIPANT_ID`; the event `component` field still distinguishes `control-plane` from `http-data-plane`.

The registration script also writes a unique `COMPOSE_PROJECT_NAME` into `.env`. This prevents Docker container/network name collisions when multiple participant demos run on the same host.

## Configure Participant Role

Open `.env` and set:

```env
PARTICIPANT_ROLE=provider
```

or:

```env
PARTICIPANT_ROLE=consumer
```

For a consumer participant, also set:

```env
REMOTE_CONTROL_PLANE_API=http://<PROVIDER_HOST>:<PROVIDER_CONTROL_PLANE_PORT>/api
REMOTE_PARTICIPANT_AUDIENCE=did:web:<PROVIDER_PARTICIPANT_ID>
```

Example:

```env
REMOTE_CONTROL_PLANE_API=http://192.168.1.21:3701/api
REMOTE_PARTICIPANT_AUDIENCE=did:web:participant_a3d127643abc
```

## Check SDO Connectivity

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-sdo.ps1
```

This validates:

- SDO health endpoint
- participant ID
- participant API key

Send one synthetic observability event:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\send-test-event.ps1
```

This confirms that the SDO collector can ingest events from this participant machine before TSG is started.

## Start Participant TSG

First run can build images:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Build
```

Later runs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Check local health:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-health.ps1
```

Open:

```text
http://<THIS_MACHINE_IP>:<CONTROL_PLANE_PORT>
http://<THIS_MACHINE_IP>:<DATA_PLANE_PORT>
http://<THIS_MACHINE_IP>:<CONTROL_PLANE_PORT>/semantic-observability
```

## Run Consumer Flow

Run this only on the consumer participant:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-consumer-flow.ps1
```

The script performs the consumer request and also calls the provider management API to agree and finalize the negotiation. This requires the provider Control Plane management API to be reachable from the consumer machine. The demo configs use `auth.enabled: false`; if auth is enabled later, this script must be extended with credentials.

## Reset

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\reset.ps1
```

## Local Two-Participant Test

Before using two real machines, you can test the distributed setup on one machine by copying the participant template twice:

```powershell
cd F:\Project\tno-security-gateway\demo\distributed-sdo
Copy-Item -Recurse .\participant .\participant-01
Copy-Item -Recurse .\participant .\participant-02
```

Register participant 01:

```powershell
cd .\participant-01
powershell -ExecutionPolicy Bypass -File .\scripts\register-participant.ps1 `
  -SdoUrl http://localhost:4100 `
  -SdoExportUrl http://host.docker.internal:4100 `
  -DisplayName "Participant 01" `
  -PublicHost host.docker.internal `
  -ControlPlanePort 3701 `
  -DataPlanePort 3702
```

Register participant 02:

```powershell
cd ..\participant-02
powershell -ExecutionPolicy Bypass -File .\scripts\register-participant.ps1 `
  -SdoUrl http://localhost:4100 `
  -SdoExportUrl http://host.docker.internal:4100 `
  -DisplayName "Participant 02" `
  -PublicHost host.docker.internal `
  -ControlPlanePort 3801 `
  -DataPlanePort 3802
```

In `participant-02\.env`, set the provider address using participant 01's registered ID:

```env
PARTICIPANT_ROLE=consumer
REMOTE_CONTROL_PLANE_API=http://host.docker.internal:3701/api
REMOTE_PARTICIPANT_AUDIENCE=did:web:<PARTICIPANT_01_ID>
```

Start both:

```powershell
cd ..\participant-01
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Build

cd ..\participant-02
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 -Build
```

Run the flow from participant 02:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-consumer-flow.ps1
```

The central SDO dashboard should show both registered participants and their observability events:

```text
http://localhost:4100
```

## Important Network Rules

Do not use `localhost` for distributed participants unless all services run on the same machine.

Use reachable IP addresses or DNS names:

```text
http://192.168.1.21:3701/api
http://192.168.1.100:4100/api/ingest/events
```

Use `host.docker.internal` only for local Docker testing on one machine. It is not a real network address for other participant machines.

Open firewall ports on each machine:

- Control Plane port, for example `3701`
- Data Plane port, for example `3702`
- SDO port `4100` on the SDO machine
