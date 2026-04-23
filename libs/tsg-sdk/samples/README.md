# TSG SDK Samples

This directory contains sample code demonstrating how to use the `@tsg-dsp/tsg-sdk` package.

## Per-module examples

Each file demonstrates a specific SDK module:

| File                                               | Description                                             |
| -------------------------------------------------- | ------------------------------------------------------- |
| [catalog-example.ts](./catalog-example.ts)         | Browse catalogs, discover participants, search datasets |
| [negotiation-example.ts](./negotiation-example.ts) | Negotiate contracts, monitor state, get agreements      |
| [transfer-example.ts](./transfer-example.ts)       | Request and manage data transfers                       |
| [wallet-example.ts](./wallet-example.ts)           | Sign JWTs, manage credentials and keys                  |
| [sso-example.ts](./sso-example.ts)                 | SSO bridge interactions, token management               |

## End-to-end example

The [end-to-end-example.ts](./end-to-end-example.ts) file demonstrates a complete data-sharing workflow using multiple SDK modules together — from discovery to negotiation to transfer.

## Running the examples

These are TypeScript source files meant as reference documentation. To run them against a live TSG deployment:

```bash
# Install dependencies
pnpm install

# Run an example with tsx
npx tsx catalog-example.ts
```

Make sure to update the base URLs and credentials in each example to match your environment.
