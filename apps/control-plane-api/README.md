# TSG Control plane

This repository contains an implementation of the [Dataspace Protocol](https://docs.internationaldataspaces.org/ids-knowledgebase/v/dataspace-protocol/overview/readme) and provides the control logic for interactions in dataspaces.

## Configuration

The configuration for the Control Plane can be provided primarily as file in `json`, `yaml`, or `toml` following the structure that is provided in `src/config.ts` where `RootConfig` is the starting point for the configuration. The file must be named `config.{json,yaml,toml}` and must be located in the current directory (in the Docker image `/app/backend`) or any parent directory, for example a YAML config in the Docker image it could be one of `/app/backend/config.yaml`, `/app/config.yaml`, or `/config.yaml`. Optionally the `CONFIG_PATH` environment variable can be used to directly point to the configuration file.
Additionally environment variables can be provided to override specific properties. For environment variables the following transformation rules are used: (1) double underscores denote separators, (2) capitalization of environment variables is ignored, (3) keys are transformed from snake case to camel case. (4) The environment variable should start with the `TSGCP` prefix. For example, the environment variable `TSGCP__SERVER__PUBLIC_DOMAIN` and `tsgcp__server__public_domain` override `server.publicDomain`.

| Key           | Required | Class          | Description                                                                                                                            |
| ------------- | -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `server`      | N        | `ServerConfig` | Primary web server configuration and public available addresses                                                                        |
| `iam`         | Y        | `IamConfig`    | Wallet and IAM configuration containing the pointers to a wallet instance and pointers to the DID identifier and credential identifier |
| `users`       | Y        | `UserConfig[]` | Management user configuration for basic authentication. Will change to a more robust user management system                            |
| `initCatalog` | N        | `InitCatalog`  | Initial catalog information containing the responsible party for this instance and a title and description                             |

## Building & testing locally

The control plane is built via typescript and npm, first install the npm dependencies:

```
npm install
```

To compile the typescript files into javascript and execute the control plane backend:

```
npm run tsc
node ./build/app.js
```

Or run directly on the typescript files using `ts-node`:

```
node --nolazy --loader ts-node/esm src/app.ts
```

> _Note_: The control plane will run by default on port `3000`

Or use the included VS Code Run configuration `Debug Main` to allow debugging functionality in VS code.
