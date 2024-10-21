# Configuration

In this section, the configuration of the control plane is explained. Configuration is used based on a `config.yaml` file which should be placed in the `apps/backend/src` folder. This `config.yaml` file is loaded when booting the application. The values get type checked, and it gives a clear error message if there is a configuration field missing or provided incorrectly. Next to the `config.yaml` file, you can also set environment variables. These override the values that are listed in the `config.yaml` file.

## Databases

By default, the development database is sqlite. We use postgres databases for production type instances of the control planes.

## Authentication

Authentication for frontend services can be done via Casdoor. This helps users who need to login to several components to authenticate themselves faster.

### Possible configuration parameters

| Name                                     | Data Type        | Explanation                                                                              | Default                   |
| ---------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| **Database Configuration**               |                  |                                                                                          |                           |
| `type`                                   | String           | Type of the database. Must be `"sqlite"` or `"postgres"`.                                |                           |
| `database`                               | String           | Name of the database.                                                                    |                           |
| **Server Configuration**                 |                  |                                                                                          |                           |
| `listen`                                 | String           | IP address to listen on.                                                                 | `"0.0.0.0"`               |
| `port`                                   | Number           | Port number for the server.                                                              | `3000`                    |
| `publicDomain`                           | String           | Public domain of the server.                                                             | `"localhost"`             |
| `publicAddress`                          | String           | Public address of the server.                                                            | `"http://localhost:3000"` |
| **Registry Configuration**               |                  |                                                                                          |                           |
| `isRegistry`                             | Boolean          | Indicates whether it's a registry.                                                       | `false`                   |
| `registryUrl`                            | String           | URL of the registry.                                                                     |                           |
| `registryDid`                            | String           | DID (Decentralized Identifier) of the registry.                                          |                           |
| `registryIntervalInMilliseconds`         | Number           | Interval in milliseconds for registry updates.                                           | `30000`                   |
| **IAM Configuration**                    |                  |                                                                                          |                           |
| `type`                                   | String           | Type of IAM. Options: `"tsg"`, `"tsg-iatp"`, `"miw"`, `"dev"`.                           |                           |
| `didId`                                  | String           | Identifier for the DID.                                                                  |                           |
| `clientId`                               | String           | Client ID for authentication.                                                            |                           |
| `clientSecret`                           | String           | Client secret for authentication.                                                        |                           |
| `tokenUrl`                               | String           | URL for token management.                                                                |                           |
| `walletUrl`                              | String           | URL for wallet management.                                                               |                           |
| **User Configuration**                   |                  |                                                                                          |                           |
| `username`                               | String           | Username for authentication.                                                             |                           |
| `password`                               | String           | Password for authentication (validated by regex).                                        |                           |
| **Runtime Configuration**                |                  |                                                                                          |                           |
| `controlPlaneInteractions`               | String           | Mode of control plane interactions. Options: `"automatic"`, `"semi-manual"`, `"manual"`. | `"automatic"`             |
| **Initialization Catalog Configuration** |                  |                                                                                          |                           |
| `creator`                                | String           | Creator of the catalog.                                                                  |                           |
| `publisher`                              | String           | Publisher of the catalog.                                                                |                           |
| `title`                                  | String           | Title of the catalog.                                                                    |                           |
| `description`                            | String           | Description of the catalog.                                                              |                           |
| `datasets`                               | Array of Strings | Array of dataset names.                                                                  |                           |
| **Root Configuration**                   |                  |                                                                                          |                           |
| `db`                                     | Object           | Database configuration.                                                                  |                           |
| `server`                                 | Object           | Server configuration.                                                                    |                           |
| `registry`                               | Object           | Registry configuration.                                                                  |                           |
| `iam`                                    | Object           | IAM configuration.                                                                       |                           |
| `users`                                  | Array of Objects | Array of user configurations.                                                            |                           |
| `initCatalog`                            | Object           | Initialization catalog configuration.                                                    |                           |
| `runtime`                                | Object           | Runtime configuration.                                                                   |                           |
