# Hosted Semantic Observability Demo Blueprint

Use this blueprint whenever the user says **run the demo**, **run the
blueprint**, or asks to view the semantic-observability demo online. Read the
whole file before starting.

## Fixed locations

```text
Workspace:       F:\Project\tno-security-gateway
Compose file:    demo\semantic-observability-sharing\docker-compose.yml
Setup script:    demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1
Flow script:     demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1
Hosted SDO URL:  https://sdo-semantic-observability-32325974766.europe-west1.run.app
```

The central SDO dashboard must run only at the hosted URL. Alfa and Bravo TSG
services run locally and export privacy-safe events to that URL.

## 1. Check the hosted service

From `F:\Project\tno-security-gateway`:

```powershell
$sdoUrl = "https://sdo-semantic-observability-32325974766.europe-west1.run.app"
$health = Invoke-RestMethod "$sdoUrl/api/health" -TimeoutSec 30
$health
```

Continue only when `status` is `ok` and `storage` is `postgres`. If it is not
healthy, inspect Cloud Run before changing any local service or cloud data.

## 2. Reuse or create cloud participant credentials

The ignored file
`demo\semantic-observability-sharing\.env` stores participant IDs and API
keys. Never print, log, commit, or paste those values.

Reuse it when all five entries exist and `SDO_OBSERVABILITY_ENDPOINT` equals:

```text
https://sdo-semantic-observability-32325974766.europe-west1.run.app/api/ingest/events
```

If the file is missing, incomplete, points at localhost, or the credentials
are rejected, register a fresh Alfa/Bravo pair:

```powershell
powershell -ExecutionPolicy Bypass -File `
  .\demo\semantic-observability-sharing\scripts\start-sdo-dashboard-demo.ps1 `
  -ExternalSdo `
  -SdoUrl $sdoUrl
```

Do not register a new pair on every run; that creates duplicate participants.

## 3. Start only the four local TSG services

When valid cloud credentials already exist:

```powershell
docker compose `
  -f .\demo\semantic-observability-sharing\docker-compose.yml `
  up -d `
  alfa-control-plane alfa-data-plane `
  bravo-control-plane bravo-data-plane
```

If source changes require new images, add `--build` before the service names.

## 4. Keep the local central dashboard stopped

```powershell
docker compose `
  -f .\demo\semantic-observability-sharing\docker-compose.yml `
  stop sdo-observability sdo-postgres
```

Do not delete the containers, volumes, local data, or Cloud SQL data unless the
user explicitly requests deletion.

## 5. Verify the four TSG health endpoints

All must return HTTP 200 before running a flow:

```text
http://localhost:3701/health
http://localhost:3702/health
http://localhost:3801/health
http://localhost:3802/health
```

Wait up to 60 seconds for startup. If one remains unhealthy, inspect
`docker compose ps` and that service's logs; do not rerun registration first.

## 6. Run the requested scenario

Run every scenario by default:

```powershell
powershell -ExecutionPolicy Bypass -File `
  .\demo\semantic-observability-sharing\scripts\run-sharing-flow.ps1 `
  -Scenario all `
  -SdoUrl $sdoUrl
```

Allowed individual scenarios:

```text
happy-path
missing-ontology
missing-schema
deprecated-artefact
validation-error
version-drift
missing-required-field
invalid-field-type
version-regression
field-adoption-change
```

The command must complete catalog discovery, negotiation, transfer, data
access, semantic event publication, and snapshot refresh without an error.

## 7. Verify hosted analytics

```powershell
$versions = Invoke-RestMethod "$sdoUrl/api/version-validation" -TimeoutSec 30
$fields = Invoke-RestMethod "$sdoUrl/api/field-usage" -TimeoutSec 30
```

After an `all` run, verify:

- `setu:vehicle-sharing` versions `1.0.0` and `2.0.0` both have validation
  observations, with a failure associated with `1.0.0`.
- `setu:vehicle.startDate` has both absent and present observations, proving
  that presence alone does not determine validation success.
- `setu:vehicle.role` has a higher usage rate for `2.0.0` than for `1.0.0`.
- Field results contain at least two participants.

Counts accumulate across runs, so do not require one fixed observation total.

## 8. Open and verify the web view

Open only:

```text
https://sdo-semantic-observability-32325974766.europe-west1.run.app/
```

Wait for refresh to finish and confirm:

- the title is `SDO Semantic Observability`;
- there are no browser console errors;
- `Validation Errors by Governed Version` contains version `2.0.0`;
- `Governed Semantic Field Usage` contains `startDate` and `role`;
- the dashboard says field results contain counts only, not values or raw
  payloads.

Leave the hosted dashboard open for the user.

## 9. Report completion

Report only:

1. the hosted dashboard link;
2. the scenario or scenarios completed;
3. the current version/error and field-usage results;
4. that the local SDO/Postgres services are stopped;
5. whether all four local TSG services remain healthy.

## Privacy and failure rules

- Never inspect or export business payload values.
- Never display participant API keys or the `.env` contents.
- Never weaken the central ingestion allowlist to make a demo pass.
- A `400` ingestion response means the demo event must be corrected to use
  allowed public governed identifiers, pseudonyms, and aggregate counts.
- A `401` response means cloud participant credentials must be registered
  again.
- Do not claim causation; say a version is associated with observed failures.
