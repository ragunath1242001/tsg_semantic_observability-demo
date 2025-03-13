---
[comment]: # (This file is auto generated)
hide_table_of_contents: true
---
# Configuration

In this section, the configuration of the analytics data plane is explained. Configuration is used based on a `config.yaml` file which should be placed in the `apps/backend` folder. This `config.yaml` file is loaded when booting the application. The values get type checked, and it gives a clear error message if there is a configuration field missing or provided incorrectly. Next to the `config.yaml` file, you can also set environment variables. These override the values that are listed in the `config.yaml` file.

## Databases

By default, the development database is sqlite. We use postgres databases for production type instances of the analytics data planes.

## Authentication

Authentication for frontend services can be done via OAuth. This helps users who need to login to several components to authenticate themselves faster. The data plane is tested against the SSO Bridge, with an Helm chart provided alongside the Helm chart of the data plane, but other OAuth services should be usable (e.g. Keycloak, or hosted OAuth services).

## Configuration parameters
| Key                                | Required | Type                     | Description                                       | Default                   |
| ---------------------------------- | -------- | ------------------------ | ------------------------------------------------- | ------------------------- |
| **`DatabaseConfig`**               |          |                          |                                                   |                           |
| `db`                               |          | `DatabaseConfig`         | Database configuration                            |                           |
| `db.type`                          |          | `"sqlite" \| "postgres"` | Type of database                                  |                           |
| `db.database`                      |          | `String`                 | Name of the database                              |                           |
| `db.synchronize`                   | Yes      | `Boolean`                | Synchronize database schema                       |                           |
| `db{type=sqlite}`                  |          | `SQLiteConfig`           | Database configuration                            |                           |
| `db{type=sqlite}.type`             |          | `"sqlite" \| "postgres"` | Type of database                                  | `"sqlite"`                |
| `db{type=sqlite}.database`         |          | `String`                 | Name of the database                              |                           |
| `db{type=sqlite}.synchronize`      | Yes      | `Boolean`                | Synchronize database schema                       |                           |
| `db{type=postgres}`                |          | `PostgresConfig`         | Database configuration                            |                           |
| `db{type=postgres}.host`           |          | `String`                 | Host of the database                              |                           |
| `db{type=postgres}.port`           |          | `Number`                 | Port of the database                              |                           |
| `db{type=postgres}.username`       |          | `String`                 | Username of the database                          |                           |
| `db{type=postgres}.password`       |          | `String`                 | Password of the database                          |                           |
| `db{type=postgres}.ssl`            | Yes      | `Unknown`                | SSL configuration of the database                 |                           |
| `db{type=postgres}.type`           |          | `"sqlite" \| "postgres"` | Type of database                                  | `"postgres"`              |
| `db{type=postgres}.database`       |          | `String`                 | Name of the database                              |                           |
| `db{type=postgres}.synchronize`    | Yes      | `Boolean`                | Synchronize database schema                       |                           |
| **`ServerConfig`**                 |          |                          |                                                   |                           |
| `server`                           | Yes      | `ServerConfig`           | Server configuration                              |                           |
| `server.listen`                    | Yes      | `String`                 | IP address the server listens on                  | `"0.0.0.0"`               |
| `server.port`                      | Yes      | `Number`                 | Port the server listens on                        | `3000`                    |
| `server.publicDomain`              | Yes      | `String`                 | Public domain of the server                       | `"localhost"`             |
| `server.publicAddress`             | Yes      | `String`                 | Public address of the server                      | `"http://localhost:3000"` |
| `server.subPath`                   | Yes      | `String`                 | Sub path of the server                            |                           |
| **`AuthConfig`**                   |          |                          |                                                   |                           |
| `auth`                             |          | `AuthConfig`             | Management authentication configuration           |                           |
| `auth.enabled`                     |          | `Boolean`                | Enable authentication                             | `true`                    |
| `auth.openIdConfigurationURL`      | Yes      | `String`                 | OpenID configuration URL                          |                           |
| `auth.callbackURL`                 | Yes      | `URL`                    | Callback URL the auth service will redirect users |                           |
| `auth.redirectURL`                 | Yes      | `URL`                    | Redirect URL to UI after login/logout             |                           |
| `auth.clientId`                    | Yes      | `String`                 | Client ID                                         |                           |
| `auth.clientSecret`                | Yes      | `String`                 | Client secret                                     |                           |
| `auth.rolePath`                    | Yes      | `String`                 | JSON path to extract roles from the token         | `"$.roles[*]"`            |
| **`ControlPlaneConfig`**           |          |                          |                                                   |                           |
| `controlPlane`                     |          | `ControlPlaneConfig`     | Control plane configuration                       |                           |
| `controlPlane.dataPlaneEndpoint`   |          | `URL`                    | Data plane management endpoint                    |                           |
| `controlPlane.managementEndpoint`  |          | `URL`                    | Control plane management endpoint                 |                           |
| `controlPlane.controlEndpoint`     |          | `URL`                    | Public control plane endpoint                     |                           |
| `controlPlane.initializationDelay` |          | `Number`                 | Initialization delay in milliseconds              | `5000`                    |
| `dataset`                          | Yes      | `Array`                  | Dataset configuration                             |                           |
| **`LoggingConfig`**                |          |                          |                                                   |                           |
| `logging`                          | Yes      | `LoggingConfig`          | Logging configuration                             |                           |
| `logging.debug`                    | Yes      | `Boolean`                | Enable debug request logging                      |                           |
| **`FilesConfig`**                  |          |                          |                                                   |                           |
| `files`                            | Yes      | `FilesConfig`            | Files configuration                               |                           |
| `files.path`                       | Yes      | `String`                 | Path to store uploaded files                      | `"/uploads"`              |
| **`RuntimeConfig`**                |          |                          |                                                   |                           |
| `runtime`                          |          | `RuntimeConfig`          | Runtime configuration                             |                           |
| `runtime.color`                    |          | `String`                 | Primary UI color                                  | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`            | Yes      | `String`                 | Light theme logo URL                              |                           |
| `runtime.darkThemeUrl`             | Yes      | `String`                 | Dark theme logo URL                               |                           |
| **`KubernetesConfig`**             |          |                          |                                                   |                           |
| `kubernetesConfig`                 | Yes      | `KubernetesConfig`       | Kubernetes configuration                          |                           |
| `kubernetesConfig.namespace`       | Yes      | `String`                 | Kubernetes namespace                              | `"default"`               |
