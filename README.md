# TSG Wallet

This repository contains an implementation of a SSI DID Web wallet aimed at providing the technical means for connectors in a data space to manage credentials and request verifiable credentials.

The repository is composed of a `backend` and `frontend` application that are combined into a single Docker image.

## Configuration

The configuration for the Wallet can be provided primarily as file in `json`, `yaml`, or `toml` following the structure that is provided in `backend/src/config.ts` where `RootConfig` is the starting point for the configuration. The file must be named `config.{json,yaml,toml}` and must be located in the current directory (in the Docker image `/app/backend`) or any parent directory, for example a YAML config in the Docker image it could be one of `/app/backend/config.yaml`, `/app/config.yaml`, or `/config.yaml`.
Additionally environment variables can be provided to override specific properties. For environment variables the following transformation rules are used: (1) double underscores denote separators, (2) capitalization of environment variables is ignored, (3) keys are transformed from snake case to camel case. For example, the environment variable `SERVER__PUBLIC_DOMAIN` and `server__public_domain` override `server.publicDomain`.

The primary configuration blocks of the wallet are:
| Key | Required | Class | Description |
| --- | --- | --- | --- |
| `db` | Y | `SQLiteConfig \| PostgresConfig` | Database configuration for either SQLite or Postgres |
| `server` | N | `ServerConfig` | Primary web server configuration and public available addresses |
| `mail` | N | `MailConfig` | Mail configuration for user registration and password resetting |
| `initClients` | N | `InitClientConfig[]` | Initial clients configured for the wallet, if none provided an administrative user is generated with credentials logged to standard out |
| `initKeys` | N | `InitKeyConfig[]` | Initial keys that are generated on first startup |
| `initCredentials` | N | `InitCredentialConfig[]` | Initial credentials that are issued on first startup |
| `trustAnchors` | N | `TrustAnchorConfig[]` | Trust anchor configuration used for validation of external VPs |
| `contexts` | N | `JsonLdContextConfig[]` | Supported credential contexts with optional JSON schema |

An example configuration can be found in `backend/config.yaml`

> _Note_: This section will cover all the configuration options in the future.

## Building & testing locally

To build and test the wallet locally, first you have to decide which portion of the wallet you'd want to test.

### Dependencies

The wallet is built via pnpm, first install all dependencies:

```
pnpm install
```

### Backend

To compile the typescript files into javascript and watch the wallet backend:

```
pnpm --filter backend watch
```

> _Note_: The wallet backend will run by default on port `3000`

### Frontend

To compile the typescript files into javascript and watch the wallet frontend:

```
pnpm --filter frontend dev
```

> _Note_: The Vite serve by default runs on port `5173`, but will try subsequent ports if they are already used.

Compiling the frontend into HTML, Javascript, and CSS execute:

```
pnpm --filter frontend build
```

The build result will be located in `./apps/frontend/dist`.

### Combined backend and frontend

To test the combination of backend with embedded frontend, execute the following commands in separate terminals:

```
pnpm --filter backend watch
```

```
pnpm --filter frontend dev
```

Or build the Docker image and subsequently run the docker image:

```
docker build -t tsg-wallet .
docker run --rm -it -v ./apps/backend/config.yaml:/app/config.yaml -p 3000:3000 tsg-wallet
```
