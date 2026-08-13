# Run the Semantic Observability Demo on WSL

## Setup

The central SDO dashboard and PostgreSQL database are already hosted in GCP:

<https://sdo-semantic-observability-32325974766.europe-west1.run.app>

Only clone and run the TNO Security Gateway repository. The
[`sdo-semantic-observability`](https://github.com/ragunath1242001/sdo-semantic-observability)
repository is provided for reference and is **not required locally**.

Required repository and branch:

<https://github.com/ragunath1242001/tsg_semantic_observability-demo/tree/semantic-observability-demo>

## 1. Install and verify prerequisites

Run these commands in Ubuntu/WSL:

```bash
sudo apt update
sudo apt install -y git curl docker.io docker-compose-v2
sudo service docker start

docker --version
docker compose version
docker run --rm hello-world
```

`docker compose version` must report Docker Compose v2. If Docker returns a
permission error, run the following, close WSL, and open it again:

```bash
sudo usermod -aG docker "$USER"
```

Install PowerShell 7:

```bash
sudo apt-get install -y wget apt-transport-https software-properties-common
source /etc/os-release
wget -q "https://packages.microsoft.com/config/ubuntu/$VERSION_ID/packages-microsoft-prod.deb"
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y powershell
pwsh --version
```

## 2. Clone the gateway

```bash
mkdir -p /mnt/c/Semantic
cd /mnt/c/Semantic

git clone \
  --branch semantic-observability-demo \
  --single-branch \
  https://github.com/ragunath1242001/tsg_semantic_observability-demo.git \
  tno-security-gateway

cd tno-security-gateway
```

## 3. First run

```bash
export SDO_URL="https://sdo-semantic-observability-32325974766.europe-west1.run.app"
curl -fsS "$SDO_URL/" > /dev/null

pwsh -NoProfile -File \
  ./demo/semantic-observability-sharing/scripts/start-sdo-dashboard-demo.ps1 \
  -ExternalSdo \
  -SdoUrl "$SDO_URL" \
  -Build
```

This registers Alfa and Bravo and creates
`demo/semantic-observability-sharing/.env`. It contains credentials: do not
display, share, or commit it. Do not repeat registration unless the credentials
stop working.

Check that all four local services are healthy:

```bash
docker compose \
  -f ./demo/semantic-observability-sharing/docker-compose.yml \
  ps
```

## 4. Run the demo

Run every scenario:

```bash
pwsh -NoProfile -File \
  ./demo/semantic-observability-sharing/scripts/run-sharing-flow.ps1 \
  -Scenario all \
  -SdoUrl "$SDO_URL"
```

Use `happy-path`, `missing-ontology`, `missing-schema`,
`deprecated-artefact`, `validation-error`, `version-drift`,
`missing-required-field`, `invalid-field-type`, `version-regression`, or
`field-adoption-change` instead of `all` to run one scenario.

## 5. Open the interfaces

- Central dashboard: <https://sdo-semantic-observability-32325974766.europe-west1.run.app>
- Alfa Control Plane: <http://localhost:3701>
- Alfa Data Plane: <http://localhost:3702>
- Bravo Control Plane: <http://localhost:3801>
- Bravo Data Plane: <http://localhost:3802>

## Later restarts

```bash
cd /mnt/c/Semantic/tno-security-gateway
export SDO_URL="https://sdo-semantic-observability-32325974766.europe-west1.run.app"

docker compose \
  -f ./demo/semantic-observability-sharing/docker-compose.yml \
  up -d \
  alfa-control-plane alfa-data-plane \
  bravo-control-plane bravo-data-plane

pwsh -NoProfile -File \
  ./demo/semantic-observability-sharing/scripts/run-sharing-flow.ps1 \
  -Scenario all \
  -SdoUrl "$SDO_URL"
```

## Common error

If this appears:

```text
unknown shorthand flag: 'f' in -f
```

install Compose v2 and use the exact Linux path:

```bash
sudo apt update
sudo apt install -y docker-compose-v2
docker compose version

docker compose \
  -f ./demo/semantic-observability-sharing/docker-compose.yml \
  ps
```

Use `/` in WSL paths, not `\`.
