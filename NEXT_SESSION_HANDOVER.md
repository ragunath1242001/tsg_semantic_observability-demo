# Next Session Handover

Date: 2026-06-20

## Repository Context

Working repo:

```text
F:\Project\tno-security-gateway
```

Reference/original uploaded repo:

```text
F:\Project\TNO\Dataspace Protocol\tno-security-gateway
```

Docs/playground reference:

```text
F:\Project\TNO\tno-tsg.gitlab.io
```

The uploaded `TNO` folder was inspected read-only. The current working repo is the updated one where semantic observability/listener work is being added.

## Current Understanding

The TSG dashboard/UI is not the product by itself. The semantic observability work is a listener/observer component that records what happens during normal TSG data-sharing flows.

Expected real flow:

```text
provider publishes dataset
consumer requests catalog
consumer negotiates contract
agreement is reached
transfer starts
data is accessed through HTTP Data Plane
listener records events and metrics
dashboard/report shows evidence
```

For a client demo, do not position this as “use the dashboard directly.” Position it as:

```text
Run normal TSG data-sharing actions, then verify the listener captured the right events and metrics.
```

## Deployment Understanding

Original TSG supports:

- local dev mode: separate API/UI dev servers
- Docker production mode: UI is built and embedded into the API container using `EMBEDDED_FRONTEND`
- hosted mode: Docker images + Helm + Kubernetes ingress

Typical hosted URLs:

```text
https://<host>/control-plane/
https://<host>/http-data-plane/
```

Current local links when dev servers are running:

```text
Control Plane UI:     http://localhost:5173
HTTP Data Plane UI:  http://localhost:5174
Control Plane API:    http://localhost:3000
HTTP Data Plane API: http://localhost:3001
```

## Main Work Completed

Semantic observability was added across:

- Control Plane API
- HTTP Data Plane API
- Control Plane UI
- HTTP Data Plane UI
- shared library `libs/semantic-observability`

Key events currently captured:

- catalog metadata observed
- dataset metadata changed
- dataset configuration observed
- metadata validation results
- negotiation state changes
- transfer state changes
- policy evaluation results
- data-plane access observed

Important fixes made:

- Snapshot refresh internal error was fixed by handling TypeORM `Date` timestamps in aggregate logic.
- Snapshot refresh controllers now accept filters from request body as well as query params.
- Participant logic was improved:
  - Control Plane events inherit local participant from `RootConfig.iam.didId`.
  - HTTP Data Plane supports `semanticObservability.participantId`.
  - participant pair pseudonym is generated when local + remote participant pseudonyms exist.
  - snapshot refresh now produces scoped snapshots from event dimensions, not only global rollups.
- `EvaluationContext.evaluationTime` now has `@Type(() => Date)` so JSON date strings can pass validation.

## Local Demo Script

Created:

```text
F:\Project\tno-security-gateway\scripts\semantic-observability-demo.ps1
```

Run:

```powershell
cd F:\Project\tno-security-gateway
powershell -ExecutionPolicy Bypass -File .\scripts\semantic-observability-demo.ps1
```

What it does:

- checks Control Plane and HTTP Data Plane APIs
- updates HTTP Data Plane dataset config
- refreshes Data Plane registration/catalog sync
- adds a demo dataset through `POST /management/catalog/dataset`
- attempts policy evaluation, but skips if no real stored agreement exists
- refreshes combined semantic observability snapshots
- prints recent Control Plane listener events
- prints recent HTTP Data Plane listener events
- prints combined report metric counts

The script completed successfully and showed both Control Plane and HTTP Data Plane listener evidence.

Known limitation:

The policy evaluation step is skipped in the smoke demo because a synthetic agreement is not enough. A real policy/negotiation/transfer demo needs an actual stored agreement from a real two-party flow.

## Commands Already Verified

Use `corepack pnpm` because `pnpm` may not be directly on PATH.

Verified passing:

```powershell
corepack pnpm --filter @tsg-dsp/semantic-observability test
corepack pnpm --filter control-plane-api build
corepack pnpm --filter http-data-plane-api build
corepack pnpm --filter control-plane-ui build
corepack pnpm --filter http-data-plane-ui build
```

UI builds pass with Vite warnings about large chunks and browser-externalized Node modules. Those warnings existed during successful builds and were not blocking.

## Current API/Service State

During the last session, these ports were running:

```text
3000 - Control Plane API
3001 - HTTP Data Plane API
5173 - Control Plane UI
5174 - HTTP Data Plane UI
```

If APIs need restarting after a build, run from each app folder:

```powershell
node .\dist\app.js
```

Or use the repo scripts if desired:

```powershell
corepack pnpm start:control-plane
corepack pnpm start:http-data-plane
```

## Important Files Changed/Added

New/major areas:

```text
libs/semantic-observability/
apps/control-plane-api/src/semantic-observability/
apps/http-data-plane-api/src/semantic-observability/
apps/control-plane-ui/src/views/SemanticObservability.vue
apps/http-data-plane-ui/src/views/SemanticObservability.vue
scripts/semantic-observability-demo.ps1
```

Key existing files modified:

```text
apps/control-plane-api/src/app.module.ts
apps/control-plane-api/src/config.ts
apps/control-plane-api/src/dsp/catalog/catalog.service.ts
apps/control-plane-api/src/dsp/negotiation/negotiation.service.ts
apps/control-plane-api/src/dsp/transfer/transfer.service.ts
apps/control-plane-api/src/policy/evaluation.dto.ts
apps/control-plane-api/src/policy/policy.evaluation.service.ts
apps/http-data-plane-api/src/config.ts
apps/http-data-plane-api/src/dataplane/dataplane.service.ts
apps/http-data-plane-api/src/transfer/http-transfer-handler.service.ts
libs/common-dtos/src/permissions.ts
libs/common-ui/router/route-permissions.ts
libs/common-ui/stores/user.ts
```

Local config notes:

- `apps/control-plane-api/config.yaml` currently uses `test.db`.
- `apps/http-data-plane-api/config.yaml` currently uses `test.db`.
- HTTP Data Plane config includes:

```yaml
semanticObservability:
  participantId: did:web:localhost%3A3001
```

Be careful before committing local config changes. Some config changes are useful for local demo but may not be wanted as production defaults.

## How Dataset Creation Works in the Demo

The demo creates a dataset through the Control Plane management API:

```text
POST http://localhost:3000/management/catalog/dataset
```

Flow:

```text
PowerShell script
  -> Control Plane API
  -> CatalogService.addDataset()
  -> dataset saved in Control Plane DB
  -> CatalogObserverService records semantic observability event
```

Resulting event:

```text
catalog.metadata.observed
```

The Data Plane side is triggered by updating dataset config:

```text
PUT http://localhost:3001/management/config
```

Resulting event:

```text
dataset.configuration.observed
```

## Client Testing Approach

Use three levels:

1. Listener smoke demo
   - run `scripts/semantic-observability-demo.ps1`
   - show events/report in terminal and UI

2. Client API test
   - clients call API endpoints directly/Postman
   - then verify listener events and snapshots

3. Real two-party flow
   - provider/consumer setup
   - catalog request
   - negotiation
   - agreement
   - transfer
   - data-plane access
   - listener evidence

The correct final validation is level 3.

## Next Recommended Work

1. Wire the listener demo into the repo’s real `sample/http` two-participant setup.

Relevant sample files:

```text
sample/http/http.kdl
sample/http/configs/alfa-control-plane.yaml
sample/http/configs/alfa-data-plane.yaml
sample/http/configs/bravo-control-plane.yaml
sample/http/configs/bravo-data-plane.yaml
```

The sample expects Zellij/bash, which is awkward on Windows. For Windows, either:

- create PowerShell start scripts for Alfa/Bravo services, or
- run the sample in WSL/Git Bash if available.

2. Make a full flow script:

```text
start alfa/bravo control planes + data planes
register/sync data planes
request remote catalog
request negotiation
finalize agreement
request/start transfer
execute data-plane access
refresh snapshots
print evidence
```

3. Fix policy/transfer demo properly only after real stored agreements exist. The smoke script currently skips synthetic policy evaluation when no stored agreement exists.

4. Consider whether local `test.db` config should be reverted or moved to demo-specific config before commit.

## Git/Workspace Notes

The worktree is dirty and has many untracked semantic-observability files. Do not reset or discard anything without explicit approval.

Run this to inspect:

```powershell
git -C F:\Project\tno-security-gateway status --short
```

There are also older generated/progress note files in the repo root:

```text
REVERTED_EXISTING_DASHBOARD_CHANGES.md
SEMANTIC_OBSERVABILITY_CURRENT_UPDATE.md
SEMANTIC_OBSERVABILITY_PROGRESS_REPORT.md
TSG_OBSERVABILITY_RATIONALE.md
TSG_SEMANTIC_OBSERVABILITY_HANDOVER.md
TSG_SEMANTIC_OBSERVABILITY_OVERVIEW.md
```

This file is the newest handover for continuing the next session.
