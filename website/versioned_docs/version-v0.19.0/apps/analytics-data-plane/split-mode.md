# Split Deployment Modes

The Analytics Data Plane supports three deployment modes to accommodate different network architectures and security requirements. This flexibility allows you to deploy the data plane in environments with varying levels of network access and security constraints.

## Overview

The Analytics Data Plane can be deployed in three distinct modes:

- **Standalone**: All components run together in a single deployment (default)
- **Client**: Network-constrained environment running analytics workloads locally
- **Server**: Open-network environment handling dataspace interactions

The split architecture enables scenarios where sensitive data and computation must remain within a restricted network (client), while communication with external dataspace participants happens through a separate component in a more open network (server).

## Deployment Modes

### Standalone Mode

**Use case**: Standard single-node deployment where all functionality is available in one process.

This is the default mode and maintains the current behavior where all Analytics Data Plane capabilities are available in a single deployment. Use this mode when:

- There are no network restrictions
- You want a simple, unified deployment
- Both data processing and dataspace interactions can occur in the same environment

**Characteristics**:
- All modules active: orchestration, files, events, transfers, algorithm instances
- Direct dataspace interactions (DSP protocol)
- Local job execution and event handling
- Full API surface available

**Configuration**:
```yaml
split:
  mode: standalone
```

### Client Mode

**Use case**: Network-constrained environment where sensitive data resides and analytics workloads execute.

Deploy in client mode when you need to run analytics jobs within a restricted network that cannot directly communicate with external dataspace participants. The client handles:

- **Job Execution**: Orchestrates and runs analytics workloads (Docker/Kubernetes)
- **File Storage**: Stores uploaded files and datasets locally
- **Local Events**: Accepts events from running jobs
- **User Interactions**: Handles user sign-offs and algorithm approvals

The client delegates external dataspace communication to a paired server instance.

**Characteristics**:
- Orchestration module active (spawns jobs locally)
- Files module active (stores data locally)
- Events accepted from jobs
- No direct transfer capabilities or DSP interactions
- Bridges job status, events, and file metadata to server
- Receives algorithm instances from server for approval

**Limitations**:
- Cannot create or delete algorithm instances (must come from server)
- Cannot directly participate in dataspace transfers
- Cannot handle project agreements (except sign-off)

**Configuration**:
```yaml
split:
  mode: client
  bridgePeerWsUrl: wss://server.example.com
```

### Server Mode

**Use case**: Open-network environment that handles all dataspace interactions and external communications.

Deploy in server mode to manage dataspace protocol interactions, transfers with other participants, and coordination logic. The server handles:

- **Dataspace Interactions**: DSP protocol communication with other participants
- **Transfer Management**: Negotiates and executes data transfers
- **Algorithm Distribution**: Creates algorithm instances and distributes to clients
- **Project Agreements**: Manages agreements between participants

The server does not execute analytics workloads itself but delegates execution to paired client instances.

**Characteristics**:
- Dataplane module active (transfers, DSP)
- Events module active (forwards events to/from other participants)
- Algorithm instance creation and distribution
- Project agreement management
- No local job execution
- No local file storage
- Bridges algorithm instances and received events to clients

**Limitations**:
- Cannot spawn jobs locally (delegated to clients)
- Does not store uploaded files
- Cannot accept events directly from jobs

**Configuration**:
```yaml
split:
  mode: server
  # Server listens for client WebSocket connections
  # No bridgePeerWsUrl needed - clients connect to server
```

## Communication Between Client and Server

Client and server instances communicate via a WebSocket connection for real-time bidirectional updates:

### Client → Server
- File metadata (when files are uploaded)
- Job status updates (as jobs progress)
- Algorithm events (when jobs generate events)
- Event data uploads (large binary data from analytics)

### Server → Client
- Algorithm instance metadata (when instances are created)
- Received algorithm events (from other participants)
- Job start requests (when server receives external triggers)

The WebSocket connection uses chunked transfer for large event data, with configurable chunk sizes.

## Deployment Architecture Examples

### Example 1: Single Deployment (Standalone)

```
┌─────────────────────────────────┐
│  Analytics Data Plane           │
│  (standalone mode)              │
│                                 │
│  - Job execution                │
│  - File storage                 │
│  - Dataspace interactions       │
│  - Transfers                    │
└─────────────────────────────────┘
```

### Example 2: Split Deployment (Client + Server)

```
┌────────────────────────┐           ┌────────────────────────┐
│  Restricted Network    │           │  Open Network          │
│                        │           │                        │
│  ┌──────────────────┐  │           │  ┌──────────────────┐  │
│  │ Analytics DP     │  │  WebSocket│  │ Analytics DP     │  │
│  │ (client mode)    │◄─┼───────────┼─►│ (server mode)    │  │
│  │                  │  │           │  │                  │  │
│  │ - Job execution  │  │           │  │ - DSP protocol   │  │
│  │ - File storage   │  │           │  │ - Transfers      │  │
│  │ - User UI        │  │           │  │ - Coordination   │  │
│  └──────────────────┘  │           │  └──────────────────┘  │
│                        │           │                        │
└────────────────────────┘           └────────────────────────┘
                                              │
                                              │ DSP
                                              ▼
                                     Other Participants
```

## Configuration Reference

Configure the deployment mode in your Analytics Data Plane configuration file:

```yaml
split:
  # Runtime mode: standalone, client, or server
  mode: standalone
  
  # For client mode: WebSocket URL of the server
  # Example: wss://analytics-server.example.com
  bridgePeerWsUrl: <server-websocket-url>
  
  # Chunk size for large data transfers over WebSocket (default: 524288 = 512KB)
  bridgeChunkSize: 524288
```

### Configuration Parameters

| Parameter         | Type   | Description                                                      | Default      |
| ----------------- | ------ | ---------------------------------------------------------------- | ------------ |
| `mode`            | string | Deployment mode: `standalone`, `client`, or `server`             | `standalone` |
| `bridgePeerWsUrl` | string | WebSocket URL for client to connect to server (client mode only) | -            |
| `bridgeChunkSize` | number | Chunk size in bytes for large event data transfers               | 524288       |

## Choosing the Right Mode

**Choose Standalone when**:
- You have a simple deployment scenario
- Network restrictions are not a concern
- You want to minimize operational complexity

**Choose Client + Server when**:
- Data must remain in a restricted network environment
- Analytics workloads process sensitive data
- External dataspace communication must be isolated
- You need to comply with strict data residency requirements
- You want to minimize the attack surface for data processing

## Interacting with Client Mode via the TUI

When running the Analytics Data Plane in client mode inside a container or VM where attaching a browser is not straightforward, the **ADP Client TUI** provides a terminal-based interface to interact with the client instance. It lets you manage files, monitor algorithm instances, inspect events, and download event data — all from the terminal.

The quickest way to run the TUI is via **npx** (requires Node.js to be installed) or **bunx** (requires Bun to be installed) — no installation required:

```bash
npx @tsg-dsp/adp-client-tui@latest --url http://localhost:3000/api

# or with Bun
bunx @tsg-dsp/adp-client-tui@latest --url http://localhost:3000/api
```

Alternatively, run the TUI with the pre-built Docker image. Use the `main` tag for the latest build, or pin a specific version tag for a stable deployment:

```bash
IMAGE=registry.gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway/adp-client-tui:main

docker run --rm -it $IMAGE --url http://<adp-host>:3000/api
```

:::tip Uploading files from Docker

When running the TUI inside a Docker container, only files **inside the container** are accessible. To upload files from your host machine, mount a volume:

```bash
docker run --rm -it -v /path/on/host:/data $IMAGE --url http://<adp-host>:3000/api
```

Then use `/data/<filename>` as the file path when uploading in the TUI.

:::

### Networking when the ADP runs in Docker Compose

If the ADP is deployed via Docker Compose, attach the TUI container to the same network so it can reach the ADP by its **service name**:

```bash
# Find the network — typically <project>_default
docker network ls

docker run --rm -it --network <compose-project>_default $IMAGE \
  --url http://<adp-service-name>:3000/api
```

On **Linux** you can alternatively use `--network host` and connect to `localhost`. On **macOS / Windows** (Docker Desktop), use `host.docker.internal` if the ADP port is exposed on the host.

### Authentication

The TUI supports several authentication methods:

| Method            | When to use                    | How                                                          |
| ----------------- | ------------------------------ | ------------------------------------------------------------ |
| No auth           | Auth is disabled on the ADP    | Omit all auth flags                                          |
| Bearer token      | You already have a valid token | `--token <token>` or `ADP_TOKEN` env variable                |
| Username/password | SSO Bridge is available        | `--sso-url http://<sso-host>:3700` — prompts in the terminal |

The username/password flow is recommended for headless environments — no browser needed:

```bash
# Interactive — prompts for username and password
docker run --rm -it --network <compose-project>_default $IMAGE \
  --url http://<adp-service-name>:3000/api \
  --sso-url http://<sso-service-name>:3700

# Non-interactive
docker run --rm -it --network <compose-project>_default $IMAGE \
  --url http://<adp-service-name>:3000/api \
  --sso-url http://<sso-service-name>:3700 \
  --username alice --password secret
```

#### SSO Bridge client registration

If authentication is enabled you need to register the TUI as a client in the SSO Bridge configuration:

```yaml
initClients:
  - clientId: adp-client-tui
    redirectUris:
      - "http://localhost.*"
    permissions:
      - "read:adp.file"
      - "create:adp.file"
      - "update:adp.file"
      - "delete:adp.file"
      - "read:adp.algorithm"
      - "read:adp.orchestration"
      - "read:adp.dataplane"
```

### What You Can Do in the TUI

After startup the TUI presents a main menu with the following options:

#### Files

Manage the files stored on the client ADP. From the files screen you can:

- Browse the file list (`↑`/`↓` or `j`/`k`)
- Upload a file by pressing `u` and entering the local file path
- Preview a file with `p` or `Enter`
- Delete a file with `d`
- Refresh the list with `r`

#### Algorithm Instances

Browse all algorithm instances visible to the client and check their status. Select an instance with `Enter` to open the detail screen.

#### Instance Detail

Inspect a specific algorithm instance in depth:

- View instance info and participant details
- Browse algorithm and internal events with `↑`/`↓`
- Filter events: `a` (algorithm events only), `i` (internal events only), `*` (all events)
- Open event data with `Enter`
- Save event data to a local file with `s`
- Refresh the instance and events with `r`

Use `b` or `Escape` on any screen to navigate back to the previous screen, and `q` from the main menu to quit.

## Troubleshooting

### Client cannot connect to server
- Verify `bridgePeerWsUrl` is correctly configured
- Check network connectivity and firewall rules
- Ensure server is running and WebSocket endpoint is accessible
- Review authentication configuration

### Jobs not starting in split mode
- In client mode: Ensure orchestration is properly configured (Docker/Kubernetes)
- In server mode: Jobs cannot run locally - verify client connection is active

### Events not forwarding
- Check WebSocket connection status
- Verify both client and server are in correct modes
- Review logs for bridge communication errors
- Ensure `bridgeChunkSize` is appropriate for your network

## Related Documentation

- [Configuration Reference](./configuration.md) - Complete configuration options
- [Deployment Guide](./deployment.md) - Orchestration and deployment details
- [Module Architecture](./modules.md) - Technical details of module responsibilities
