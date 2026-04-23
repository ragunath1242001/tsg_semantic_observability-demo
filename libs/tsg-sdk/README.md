# @tsg-dsp/tsg-sdk

TypeScript SDK for interacting with TSG (TNO Security Gateway) Dataspace Protocol capabilities.

## Installation

```bash
npm install @tsg-dsp/tsg-sdk
# or
pnpm add @tsg-dsp/tsg-sdk
```

## Quick Start

```typescript
import { TsgSdk } from "@tsg-dsp/tsg-sdk";

const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000",
  walletBaseUrl: "http://localhost:3001",
  ssoBridgeBaseUrl: "http://localhost:3002",
  auth: {
    method: "client_secret_post",
    clientId: "my-client",
    clientSecret: "my-secret"
  }
});

// Browse catalogs
const catalog = await sdk.catalog.getOwnCatalog();
const participants = await sdk.catalog.getRegistryAddresses();

// Negotiate for a dataset
const negotiation = await sdk.negotiations.requestNegotiation(
  datasetId,
  participantId,
  remoteAddress,
  offer
);

// Wait for agreement
const finalized = await sdk.negotiations.waitForAgreement(negotiation["@id"]!);

// Request a transfer
const transfer = await sdk.transfers.requestTransfer(
  agreementId,
  participantId,
  remoteAddress,
  "application/json",
  "http-data-plane"
);
```

## Modules

The SDK is organized into focused modules, each accessible as a property on the `TsgSdk` instance:

### `sdk.catalog` — Catalog & Registry

Browse catalogs, discover participants, and search datasets.

| Method                                         | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| `getOwnCatalog()`                              | Get the local participant's catalog        |
| `getParticipantCatalog(participantId)`         | Get a remote participant's catalog         |
| `getRegistryAddresses()`                       | Get all known participant addresses        |
| `getRegistryCatalogs()`                        | Get all catalogs from the registry         |
| `getDidDocuments()`                            | Get DID documents from the registry        |
| `refreshRegistry()`                            | Refresh the registry to discover new peers |
| `getDataplanes()`                              | List configured data planes                |
| `getDataset(id, audience, address)`            | Get a specific dataset                     |
| `getDatasetConformingTo(conformsTo, audience)` | Find a dataset by conformance URI          |

### `sdk.negotiations` — Contract Negotiations

Manage the full negotiation lifecycle.

| Method                                              | Description                    |
| --------------------------------------------------- | ------------------------------ |
| `listNegotiations()`                                | List all negotiations          |
| `getNegotiation(processId)`                         | Get negotiation details        |
| `getAgreement(agreementId)`                         | Get an agreement               |
| `getNegotiationsForDataset(datasetId)`              | Get negotiations for a dataset |
| `requestNegotiation(datasetId, participantId, ...)` | Request a new negotiation      |
| `terminateNegotiation(processId, code, reason)`     | Terminate a negotiation        |
| `waitForState(processId, targetState)`              | Poll until target state        |
| `waitForAgreement(processId)`                       | Poll until FINALIZED           |
| `negotiateAndWait(datasetId, participantId, ...)`   | Request + wait for agreement   |

### `sdk.transfers` — Data Transfers

Manage the full transfer lifecycle.

| Method                                                     | Description                    |
| ---------------------------------------------------------- | ------------------------------ |
| `listTransfers()`                                          | List all transfers             |
| `requestTransfer(agreementId, participantId, ...)`         | Request a new transfer         |
| `getTransfer(processId)`                                   | Get transfer details           |
| `startTransfer(processId, dataAddress?)`                   | Start a transfer               |
| `completeTransfer(processId)`                              | Complete a transfer            |
| `terminateTransfer(processId, code?, reason?)`             | Terminate a transfer           |
| `suspendTransfer(processId, reason?)`                      | Suspend a transfer             |
| `waitForState(processId, targetState)`                     | Poll until target state        |
| `waitForStart(processId)` / `waitForCompletion(processId)` | Poll until STARTED / COMPLETED |
| `transferAndWaitForStart(agreementId, ...)`                | Request + wait for start       |

### `sdk.wallet` — Wallet & Credentials

Signing, credentials, keys, and DID management.

| Method                           | Description                  |
| -------------------------------- | ---------------------------- |
| `signJwt(request)`               | Request a JWT signature      |
| `validateJwt(request)`           | Validate a JWT               |
| `listCredentials()`              | List all credentials         |
| `getCredential(credentialId)`    | Get a specific credential    |
| `deleteCredential(credentialId)` | Delete a credential          |
| `revokeCredential(credentialId)` | Revoke a credential          |
| `getCredentialConfig()`          | Get credential configuration |
| `listDataspaceCredentials()`     | List dataspace credentials   |
| `getDidDocument()`               | Get the DID document         |
| `getDidServices()`               | Get registered DID services  |
| `listKeys()`                     | List all keys                |
| `getKey(keyId)`                  | Get a specific key           |
| `deleteKey(keyId)`               | Delete a key                 |
| `setDefaultKey(keyId)`           | Set the default key          |
| `createOffer(request)`           | Create a credential offer    |
| `requestOfferViaDcp(request)`    | Request offer via DCP        |
| `getOffer(id)`                   | Get a credential offer       |
| `revokeOffer(id)`                | Revoke a credential offer    |

### `sdk.sso` — SSO Bridge

Token management, OpenID Connect, and user/client management.

| Method                                       | Description                    |
| -------------------------------------------- | ------------------------------ |
| `getAccessToken()`                           | Get an access token            |
| `getOpenIdConfiguration()`                   | Get OpenID configuration       |
| `getJwks()`                                  | Get the JWKS                   |
| `exchangeAuthorizationCode(code, ...)`       | Exchange an authorization code |
| `refreshAccessToken(refreshToken, clientId)` | Refresh an access token        |
| `management.getUsers()`                      | List users                     |
| `management.createUser(user)`                | Create a user                  |
| `management.updateUser(id, user)`            | Update a user                  |
| `management.deleteUser(id)`                  | Delete a user                  |
| `management.getClients()`                    | List OAuth clients             |
| `management.createClient(client)`            | Create a client                |
| `management.updateClient(id, client)`        | Update a client                |
| `management.deleteClient(id)`                | Delete a client                |
| `management.getPermissions()`                | List permissions               |

## Authentication

The SDK supports three authentication methods:

### Client Secret (M2M)

```typescript
const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000",
  ssoBridgeBaseUrl: "http://localhost:3002",
  auth: {
    method: "client_secret_post",
    clientId: "my-client",
    clientSecret: "my-secret"
  }
});
```

### Private Key JWT (M2M)

```typescript
const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000",
  ssoBridgeBaseUrl: "http://localhost:3002",
  auth: {
    method: "private_key_jwt",
    clientId: "my-client",
    privateKeyJwk: myPrivateKey
  }
});
```

### Pre-obtained Access Token

```typescript
const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000",
  auth: {
    method: "access_token",
    accessToken: "eyJhbGciOi..."
  }
});
```

### No Authentication

```typescript
const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000"
});
```

## Optional Modules

The `wallet` and `sso` modules are optional. If their base URLs are not provided, accessing their methods will throw a `NOT_CONFIGURED` error with a helpful message:

```typescript
const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3000"
});

// This will throw: "wallet module is not configured. Provide 'walletBaseUrl' in TsgSdkConfig."
await sdk.wallet.signJwt(request);
```

## Error Handling

All SDK errors are instances of `SdkError` with a typed `code` property:

```typescript
import { SdkError, SdkErrorCode } from "@tsg-dsp/tsg-sdk";

try {
  await sdk.catalog.getParticipantCatalog("unknown-participant");
} catch (error) {
  if (error instanceof SdkError) {
    switch (error.code) {
      case SdkErrorCode.NOT_FOUND:
        console.log("Participant not found");
        break;
      case SdkErrorCode.AUTH_FAILED:
        console.log("Authentication failed");
        break;
      case SdkErrorCode.POLLING_TIMEOUT:
        console.log("Operation timed out");
        break;
    }
  }
}
```

## Polling

Methods that wait for state changes (`waitForAgreement`, `waitForStart`, etc.) accept polling options:

```typescript
await sdk.negotiations.waitForAgreement("process-id", {
  intervalMs: 2000, // Poll every 2 seconds (default: 1000)
  maxRetries: 30 // Max attempts (default: 20)
});
```

## License

Apache-2.0
