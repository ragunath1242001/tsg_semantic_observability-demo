# Client Runbook: Semantic Observability Docker Demo

This runbook explains how a client can run the semantic observability demo on their own machine using Docker Compose.

## What The Client Needs

- Docker Desktop installed and running
- Git installed, or a downloaded ZIP of the repository
- PowerShell
- Free local ports:
  - `3501` for the Control Plane
  - `3502` for the HTTP Data Plane

No local Node.js, pnpm, or Vite setup is required.

## Get The Code

Clone the GitHub repository:

```powershell
git clone https://github.com/ragunath1242001/tsg_semantic_observability-demo.git
cd tsg_semantic_observability-demo
git checkout semantic-observability-demo
```

If the repository was downloaded as a ZIP, extract it and open PowerShell inside the extracted folder.

## Start The Demo

From the repository root:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml up --build -d
```

If running from WSL or another Linux shell, use forward slashes:

```bash
docker compose -f ./demo/semantic-observability/docker-compose.yml up --build -d
```

Important: type a normal hyphen `-` before `f`. Do not use a copied en dash `–` or em dash `—`; Docker will report `unknown shorthand flag: 'f'`.

This builds and starts:

- Alfa Control Plane
- Alfa HTTP Data Plane
- embedded Control Plane UI
- embedded HTTP Data Plane UI

## Open The UIs

Open these URLs in a browser on the same machine where Docker is running:

```text
Control Plane API and UI:       http://localhost:3501
HTTP Data Plane API and UI:     http://localhost:3502
Control Plane observability UI: http://localhost:3501/semantic-observability
HTTP Data Plane observability:  http://localhost:3502/semantic-observability
```

`localhost` means the client's own machine. If the demo is run on a remote server or VM, replace `localhost` with that server's IP address or DNS name.

## Verify The Services

Check container status:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml ps
```

Both services should show as running/healthy.

Check health endpoints:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3501/health
Invoke-WebRequest -UseBasicParsing http://localhost:3502/health
```

Both should return HTTP status `200`.

## Run The Smoke Demo

After the containers are running:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability\scripts\run-smoke-demo.ps1
```

The smoke demo:

- checks both services
- updates the HTTP Data Plane dataset configuration
- refreshes Data Plane registration and catalog synchronization
- adds demo catalog metadata
- refreshes semantic observability snapshots
- prints recent events and aggregate metric counts

The policy evaluation step may print a skipped/500 message because this script does not create a real stored agreement from a full two-party data-sharing flow. That is acceptable for this smoke demo.

## Run The Real Sharing Demo

Use this when the client wants to validate observability during an actual data exchange.

Start the two-party sharing demo:

```powershell
docker compose -f .\demo\semantic-observability-sharing\docker-compose.yml up --build -d
```

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
```

This starts Alfa as the provider and Bravo as the consumer. The script performs catalog request, contract negotiation, transfer request, and one data access through the HTTP data planes.

Open:

```text
Alfa Control Plane:        http://localhost:3701
Alfa Data Plane:           http://localhost:3702
Bravo Control Plane:       http://localhost:3801
Bravo Data Plane:          http://localhost:3802
Alfa observability UI:     http://localhost:3701/semantic-observability
Bravo observability UI:    http://localhost:3801/semantic-observability
```

For a clean reset:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability-sharing\scripts\reset.ps1
```

## Stop The Demo

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml down
```

## Reset The Demo

Use this when the client wants a clean run:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml down -v --remove-orphans
```

Then start again:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml up --build -d
```

## Common Problems

### Docker command is not found

Docker Desktop is not installed, not running, or not available in the terminal path.

Fix:

- Start Docker Desktop
- Open a new PowerShell window
- Run:

```powershell
docker --version
```

### Site cannot be reached

The containers may not be running yet, or the ports may be blocked/in use.

Check:

```powershell
docker compose -f .\demo\semantic-observability\docker-compose.yml ps
```

If services are still starting, wait 30-60 seconds and refresh the browser.

### Port 3501 or 3502 is already in use

Another local application is using the demo ports.

Check which process is using the port:

```powershell
netstat -ano | findstr :3501
netstat -ano | findstr :3502
```

Stop the conflicting application, or change the host ports in:

```text
demo/semantic-observability/docker-compose.yml
```

For example, change:

```yaml
- "3501:3000"
```

to:

```yaml
- "3601:3000"
```

Then open `http://localhost:3601`.

### Docker build fails while pulling images

This is usually a network, proxy, VPN, or registry access issue.

Fix:

- Confirm internet access
- Start Docker Desktop
- Sign in to Docker Desktop if required
- Retry the command
- If using a corporate network, ask IT whether Docker Hub access is blocked

### The smoke script fails at policy evaluation

This can be acceptable in this demo. The script uses synthetic policy data and may not have a real stored agreement from a complete two-party transfer flow.

Continue checking the later output. The important validation is that combined events and metric counts are printed.

## Test With Your Own Dataset

Clients can test semantic observability with their own dataset metadata and backend API.

Start from the example config:

```text
demo/semantic-observability/client-data/dataset-config.example.json
```

Create a copy and update:

- `title`
- `description`
- `landingPage`
- `baseSemanticModelRef`
- `semanticModelRef`
- `backendUrl`
- `mediaType`
- `schemaRef`
- `openApiSpecRef`
- `extraProps`

Important Docker networking rule:

- If the backend API is on the public internet, use its normal `https://...` URL.
- If the backend API runs on the client's same laptop, do not use `localhost` in `backendUrl`.
- For a backend running on the client's laptop, use:

```text
http://host.docker.internal:<port>
```

Example:

```json
"backendUrl": "http://host.docker.internal:8080/api/data"
```

Load the client dataset config:

```powershell
powershell -ExecutionPolicy Bypass -File .\demo\semantic-observability\scripts\load-client-dataset.ps1 `
  -DatasetConfig .\demo\semantic-observability\client-data\dataset-config.example.json `
  -RefreshSnapshots
```

Then open:

```text
Control Plane observability UI: http://localhost:3501/semantic-observability
HTTP Data Plane observability:  http://localhost:3502/semantic-observability
```

This flow updates the HTTP Data Plane dataset configuration, refreshes Data Plane registration/catalog synchronization, refreshes observability snapshots when `-RefreshSnapshots` is provided, and prints recent combined observability events.

## Expected Successful Output

At the end of a successful smoke run, the script prints URLs like:

```text
Control Plane API and UI: http://localhost:3501
HTTP Data Plane API and UI: http://localhost:3502
Control Plane observability UI: http://localhost:3501/semantic-observability
HTTP Data Plane observability UI: http://localhost:3502/semantic-observability
```

It should also print non-error sections for:

- Recent combined observability events
- Recent HTTP Data Plane listener events
- Current combined report
