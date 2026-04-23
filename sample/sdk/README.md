# SDK Playground

Interactive test environment for the `@tsg-dsp/tsg-sdk` package against live service instances.

## Quick start

```bash
zellij --layout sample/sdk/sdk.kdl
```

This starts a Zellij session with:

| Tab                    | Service                        | Ports       |
| ---------------------- | ------------------------------ | ----------- |
| **📦 sdk** (focused)   | Interactive playground + shell | —           |
| 🔐 sso-bridge          | SSO Bridge API + UI            | 3700 / 3750 |
| 🔑 authority/wallet    | Authority Wallet API + UI      | 3400 / 3450 |
| 🔑 alfa/wallet         | Alfa Wallet API + UI           | 3500 / 3550 |
| 🕹️ alfa/control-plane  | Alfa Control Plane API + UI    | 3501 / 3551 |
| 🔑 bravo/wallet        | Bravo Wallet API + UI          | 3600 / 3650 |
| 🕹️ bravo/control-plane | Bravo Control Plane API + UI   | 3601 / 3651 |

## Running the playground

Once all services are up (check their tabs), run in the SDK tab:

```bash
pnpm --filter tsg-sdk build && pnpm --filter tsg-sdk playground
```

The interactive menu lets you exercise every SDK module:

- **SSO**: tokens, OpenID config, client/user management
- **Catalog**: own catalog, remote catalogs, registry discovery
- **Wallet**: DID documents, keys, credentials, services
- **Negotiations**: list, request, full negotiate-and-wait flow
- **Transfers**: list transfers

## SDK authentication

The playground uses a dedicated `sdk-client` registered in the SSO bridge with `client_secret_post` auth:

```typescript
{
  clientId: "sdk-client",
  clientSecret: "sdk-secret",
  method: "client_secret_post"
}
```

This client has broad permissions across all modules for testing purposes.

## Ad-hoc REPL usage

You can also import the SDK in a TypeScript REPL:

```bash
pnpm --filter tsg-sdk repl
```

```typescript
const { TsgSdk } = await import("@tsg-dsp/tsg-sdk");

const sdk = TsgSdk.create({
  controlPlaneBaseUrl: "http://localhost:3501",
  walletBaseUrl: "http://localhost:3500",
  ssoBridgeBaseUrl: "http://localhost:3700",
  auth: {
    method: "client_secret_post",
    clientId: "sdk-client",
    clientSecret: "sdk-secret"
  }
});

// Try it out
const catalog = await sdk.catalog.getOwnCatalog(true);
const did = await sdk.wallet.getDidDocument();
const token = await sdk.sso.getAccessToken();
```

## Architecture

```
Alfa                              Bravo
┌─────────────┐                   ┌─────────────┐
│ Control     │ ◄──── DSP ────►   │ Control     │
│ Plane :3501 │                   │ Plane :3601 │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
┌──────┴──────┐                   ┌──────┴──────┐
│ Wallet      │                   │ Wallet      │
│ :3500       │                   │ :3600       │
└─────────────┘                   └─────────────┘
       │                                 │
       └────────────┐   ┌───────────────┘
                    │   │
              ┌─────┴───┴─────┐
              │  SSO Bridge   │
              │  :3700        │
              └───────────────┘
                    │
              ┌─────┴─────────┐
              │  Authority    │
              │  Wallet :3400 │
              └───────────────┘

SDK client authenticates via SSO Bridge,
then talks to any Control Plane / Wallet.
```
