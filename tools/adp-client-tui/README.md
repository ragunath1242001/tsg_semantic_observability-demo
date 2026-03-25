# ADP Client TUI

Terminal User Interface for the Analytics Data Plane in **client mode**.

## Features

- **File Management** — List, upload, preview, and delete files
- **Algorithm Instances** — Browse all algorithm instances with status overview
- **Bridge Status** — Inspect WebSocket bridge connectivity, last message activity, and reconnect state
- **Instance Detail** — View instance info, participants, and events (algorithm + internal) with filtering and event data download
- **Authentication** — Supports bearer tokens, username/password login via SSO Bridge, and browser-based OAuth PKCE flow

## Prerequisites

- Node.js >= 22
- A running Analytics Data Plane instance

## Installation

```bash
pnpm install
pnpm build
```

## Usage

```bash
# Basic usage (no auth)
pnpm dev -- --url http://localhost:3552/api

# With a bearer token
pnpm dev -- --url http://localhost:3552/api --token <your-token>

# With username/password login (will prompt for credentials)
pnpm dev -- --url http://localhost:3552/api --sso-url http://localhost:3700

# With username/password provided via CLI (non-interactive)
pnpm dev -- --url http://localhost:3552/api --sso-url http://localhost:3700 --username alice --password secret

# With a custom OAuth client ID
pnpm dev -- --url http://localhost:3552/api --sso-url http://localhost:3700 --client-id my-tui-client
```

### Environment Variables

| Variable    | Description                           |
| ----------- | ------------------------------------- |
| `ADP_TOKEN` | Bearer token (alternative to --token) |

### CLI Options

| Flag              | Description                               | Default          |
| ----------------- | ----------------------------------------- | ---------------- |
| `-u, --url`       | ADP API base URL (required)               | -                |
| `-t, --token`     | Bearer token for authentication           | -                |
| `-s, --sso-url`   | SSO Bridge URL for login                  | -                |
| `-c, --client-id` | OAuth client ID                           | `adp-client-tui` |
| `--username`      | SSO Bridge username (prompted if omitted) | -                |
| `--password`      | SSO Bridge password (prompted if omitted) | -                |

## Navigation

### Main Menu

- `↑↓` or `j/k` — Navigate menu items
- `Enter` — Select
- `q` — Quit

### Files Screen

- `↑↓` or `j/k` — Navigate file list
- `u` — Upload a file (enter file path)
- `d` — Delete selected file
- `p` or `Enter` — Preview selected file
- `r` — Refresh file list
- `b` or `Escape` — Back to main menu

### Algorithm Instances Screen

- `↑↓` or `j/k` — Navigate instance list
- `Enter` — View instance details
- `r` — Refresh list
- `b` or `Escape` — Back to main menu

### Bridge Status Screen

- `r` — Refresh bridge status
- `b` or `Escape` — Back to main menu

### Instance Detail Screen

- `↑↓` or `j/k` — Navigate events
- `Enter` — View event data
- `s` — Save event data to file
- `a` — Filter: algorithm events only
- `i` — Filter: internal events only
- `*` — Filter: show all events
- `r` — Refresh instance & events
- `b` or `Escape` — Back to instances list

## Authentication

### When auth is disabled

The TUI proceeds without authentication automatically.

### Token-based auth

Provide a bearer token via:

- `--token <token>` CLI flag
- `ADP_TOKEN` environment variable

### Username/password login (recommended for SSH/VM)

Requires `--sso-url` pointing to the SSO Bridge. The TUI will:

1. Prompt for username and password in the terminal (or accept `--username` / `--password`)
2. Authenticate against the SSO Bridge's OAuth endpoint
3. Receive a bearer token without needing a browser

This is the recommended approach when running the TUI on a headless VM via SSH.

### Browser-based OAuth (PKCE) flow

The browser-based PKCE flow is also available via `performPKCEFlow()` in the auth module,
but the default with `--sso-url` is the headless username/password flow.

## SSO Bridge Client Registration

Add the TUI client to your SSO Bridge configuration:

```yaml
initClients:
  - clientId: adp-client-tui
    redirectUris:
      - "^http://127\\.0\\.0\\.1:\\d+/callback$"
    permissions:
      - "read:adp.file"
      - "create:adp.file"
      - "update:adp.file"
      - "delete:adp.file"
      - "read:adp.algorithm"
      - "read:adp.orchestration"
      - "read:adp.dataplane"
```

## Development

```bash
# Run in development mode with tsx
pnpm dev -- --url http://localhost:3552/api

# Build for production
pnpm build

# Run the built version
pnpm start -- --url http://localhost:3552/api
```
