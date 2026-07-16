# Reverted Existing Dashboard Changes

This document records the changes that were intentionally reverted after splitting out the semantic observability dashboards.

The goal was to keep the existing HTTP Data Plane and Control Plane dashboard behavior unchanged, and keep only the new Semantic Observability views/routes/event collection.

## Reverted Changes

### Control Plane title/header cleanup

Files that were reverted to original behavior:

- `apps/control-plane-api/config.yaml`
- `apps/control-plane-ui/src/layout/AppLayoutControlPlane.vue`
- `apps/control-plane-ui/src/stores/dsp.ts`

What had changed:

- `initCatalog.title` was changed from `Party 1` to `Control Plane`.
- The Control Plane topbar was changed to suppress the repeated label when the catalog title was also `Control Plane`.
- The browser document title was changed to avoid showing `Control Plane - Control Plane`.

Why it was reverted:

- This touched existing Control Plane UI/catalog behavior.
- The requested semantic observability work should not alter existing dashboard/header behavior.

How to reapply later:

- Change `initCatalog.title` in `apps/control-plane-api/config.yaml` if the catalog title should no longer be `Party 1`.
- In `apps/control-plane-ui/src/layout/AppLayoutControlPlane.vue`, pass a computed topbar `name` that is `undefined` when `ownCatalog.title` equals the fixed topbar title.
- In `apps/control-plane-ui/src/stores/dsp.ts`, set `window.document.title` to only `Control Plane` when the catalog title is also `Control Plane`.

### HTTP Data Plane standalone state fallback

File that was reverted to original behavior:

- `apps/http-data-plane-api/src/dataplane/dataplane.service.ts`

What had changed:

- Startup registration failure was changed to create a local standalone data-plane state instead of rejecting initialization.
- `getState()` and `getStateDto()` were changed to return that local state when the control-plane registration state was missing.
- `updateDatasetConfig()` was changed to call `this.getState()` instead of `this.registration.getState()`.

Why it was reverted:

- This changed existing Dashboard and Metadata behavior.
- The original behavior requires the HTTP data plane to be registered with the Control Plane before `/management/state` succeeds.

How to reapply later:

- Add a private `tryRegisterDataplane()` helper that calls `registerDataplane()` and falls back to saving a local `HttpDatasetConfigDao` when registration fails.
- Call `tryRegisterDataplane()` from `onModuleInit()` instead of rejecting initialization on registration failure.
- Add a private `getLocalState()` helper that builds a `DataPlaneStateDao` from `this.activeConfig`.
- Update `getState()` to try `this.registration.getState()` first and return `getLocalState()` if registration state is missing.
- Update `getStateDto()` to call `this.getState()`.
- Update `updateDatasetConfig()` to call `this.getState()` if local standalone dataset updates should work.

## Kept Changes

These were not reverted because they belong to the semantic observability component:

- New `Semantic Observability` route/menu entries.
- App-local semantic observability dashboard views.
- Semantic observability backend modules/controllers/entities.
- Event recording hooks that emit semantic observability data from catalog, negotiation, transfer, policy, and HTTP data-plane metadata flows.

## Reapply Guidance

If these reverted changes are needed again, reapply them as a separate task or commit from semantic observability. That keeps the scope clear:

- Semantic observability: dashboard and metrics/event collection.
- Existing dashboard behavior: local standalone mode and Control Plane title/header cleanup.
