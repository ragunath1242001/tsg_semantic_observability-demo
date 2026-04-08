---
sidebar_position: 4
---

# Common Data Plane API

`common-data-plane-api` provides the reusable backend building blocks used by TSG data-plane implementations. Instead of each data plane defining its own transfer controller shape, control-plane client wiring, and registration flow, this library provides a shared structure that applications can plug into.

## What The Library Does

The library packages the parts that most data planes have in common:

- a shared `TransferController` for transfer lifecycle endpoints
- the `ITransferHandler` interface that applications implement with their own business logic
- client services for talking to the control plane, wallet, catalog, negotiation, and transfer endpoints
- a `CommonDataPlaneModule` that wires the reusable services together
- configuration for control-plane and management endpoints
- shared error and test-helper utilities

This makes it easier to build a new data plane that behaves like the existing ones without copying a large amount of integration code.

## Transfer Lifecycle Support

The shared `TransferController` exposes the common transfer lifecycle endpoints used by the platform:

- transfer request
- transfer start
- transfer completion
- transfer suspension
- transfer termination

Those endpoints are already protected with the shared ABAC model:

- `create:dp.transfer` for transfer requests
- `execute:dp.transfer` for start, completion, suspension, and termination actions

That means a new data plane implementation automatically participates in the same permission model and audit flow used elsewhere in TSG.

## Application Extension Point: `ITransferHandler`

The main extension point is the `ITransferHandler` interface. The shared controller delegates all transfer-specific work to an implementation provided by the application.

Your implementation must handle:

- `handleTransferRequest`
- `handleTransferStart`
- `handleTransferComplete`
- `handleTransferTerminate`
- `handleTransferSuspend`

This is where application-specific transfer logic belongs. The shared library owns the controller shape and integration pattern. The application owns the actual transfer behavior.

Example outline:

```typescript
@Injectable()
export class MyTransferHandler implements ITransferHandler {
  async handleTransferRequest(message, role, processId, remoteParty, datasetId) {
    return await this.transferService.request(message, role, processId, remoteParty, datasetId);
  }

  async handleTransferStart(message, processId) {
    await this.transferService.start(message, processId);
  }

  async handleTransferComplete(message, processId) {
    await this.transferService.complete(message, processId);
  }

  async handleTransferTerminate(message, processId) {
    await this.transferService.terminate(message, processId);
  }

  async handleTransferSuspend(message, processId) {
    await this.transferService.suspend(message, processId);
  }
}
```

## Reusable Client Services

The module also exposes shared service clients for common cross-service calls:

- `CatalogClientService`
- `NegotiationClientService`
- `TransferClientService`
- `WalletClientService`
- `DataPlaneRegistrationService`

These services reuse the shared auth stack from `common-api`, which means outgoing calls can reuse bearer-token handling, correlation IDs, and delegated request context.

Use them when a data plane needs to call another TSG service instead of creating a separate client layer from scratch.

## Configuration

The shared control-plane configuration defines the main integration points:

- `dataPlaneEndpoint`
- `managementEndpoint`
- `walletEndpoint`
- `controlEndpoint`
- `initializationDelay`
- `dataPlaneTitle`

These settings determine where the data plane connects, how it identifies its management surface, and how it presents itself when registering or exposing management behavior.

Typical configuration concerns include:

- the management endpoint used for control-plane interactions
- whether a wallet endpoint is available in the deployment
- how long startup should wait before initialization steps begin
- the display title used for the data plane instance

## Registration And State

`DataPlaneRegistrationService` handles the shared part of registering a data plane and storing registration state. This gives applications a reusable pattern for bootstrapping themselves with the control plane and recovering state on restart.

Use this when your data plane should register itself consistently with the rest of the platform rather than inventing a parallel bootstrap flow.

## Relationship To Other Shared Libraries

### common-api

`common-data-plane-api` builds on `common-api` for authentication, authorization, outgoing service calls, and request context propagation.

### common-dsp

The controller and service interfaces use DSP DTOs from `common-dsp`. That keeps transfer messages, catalog operations, and related protocol payloads aligned with the shared protocol vocabulary.
