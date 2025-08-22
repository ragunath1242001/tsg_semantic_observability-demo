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

## Persistent Volume Claim link with Jobs

The Kubernetes Persistent Volume Claim (PVC) used for file uploads can be linked with Jobs that are started by the Analytics Data Plane. To use this behavior the `files.pvcName` must be set to the same PVC name as is used for the `/uploads` folder.
Since PVCs can have different access modes, having a incompatible access mode will result in Jobs not being able to start. Please make sure the PVC has the access mode `ReadWriteMany` (RWX) or `ReadOnlyMany` (ROX) if you want to use the PVC with Jobs. The default access mode for most volume providers is `ReadWriteOnce` (RWO), which is not compatible with Jobs.

## Configuration parameters
| Key                                | Required | Type                     | Description                                       | Default                               |
| ---------------------------------- | -------- | ------------------------ | ------------------------------------------------- | ------------------------------------- |
| **`DatabaseConfig`**               |          |                          |                                                   |                                       |
| `db`                               | Yes      | `DatabaseConfig`         | Database configuration                            |                                       |
| `db.type`                          | Yes      | `"sqlite" \| "postgres"` | Type of database                                  |                                       |
| `db.database`                      | Yes      | `String`                 | Name of the database                              |                                       |
| `db.synchronize`                   |          | `Boolean`                | Synchronize database schema                       |                                       |
| `db{type=sqlite}`                  | Yes      | `SQLiteConfig`           | Database configuration                            |                                       |
| `db{type=sqlite}.type`             |          | `"sqlite" \| "postgres"` | Type of database                                  | `"sqlite"`                            |
| `db{type=sqlite}.database`         | Yes      | `String`                 | Name of the database                              |                                       |
| `db{type=sqlite}.synchronize`      |          | `Boolean`                | Synchronize database schema                       |                                       |
| `db{type=postgres}`                | Yes      | `PostgresConfig`         | Database configuration                            |                                       |
| `db{type=postgres}.host`           | Yes      | `String`                 | Host of the database                              |                                       |
| `db{type=postgres}.port`           | Yes      | `Number`                 | Port of the database                              |                                       |
| `db{type=postgres}.username`       | Yes      | `String`                 | Username of the database                          |                                       |
| `db{type=postgres}.password`       | Yes      | `String`                 | Password of the database                          |                                       |
| `db{type=postgres}.ssl`            |          | `Unknown`                | SSL configuration of the database                 |                                       |
| `db{type=postgres}.type`           |          | `"sqlite" \| "postgres"` | Type of database                                  | `"postgres"`                          |
| `db{type=postgres}.database`       | Yes      | `String`                 | Name of the database                              |                                       |
| `db{type=postgres}.synchronize`    |          | `Boolean`                | Synchronize database schema                       |                                       |
| **`ServerConfig`**                 |          |                          |                                                   |                                       |
| `server`                           |          | `ServerConfig`           | Server configuration                              |                                       |
| `server.listen`                    |          | `String`                 | IP address the server listens on                  | `"0.0.0.0"`                           |
| `server.port`                      |          | `Number`                 | Port the server listens on                        | `3000`                                |
| `server.publicDomain`              |          | `String`                 | Public domain of the server                       | `"localhost"`                         |
| `server.publicAddress`             |          | `String`                 | Public address of the server                      | `"http://localhost:3000"`             |
| `server.subPath`                   |          | `String`                 | Sub path of the server                            |                                       |
| **`AuthConfig`**                   |          |                          |                                                   |                                       |
| `auth`                             | Yes      | `AuthConfig`             | Management authentication configuration           |                                       |
| `auth.enabled`                     |          | `Boolean`                | Enable authentication                             | `true`                                |
| `auth.openIdConfigurationURL`      |          | `String`                 | OpenID configuration URL                          |                                       |
| `auth.callbackURL`                 |          | `URL`                    | Callback URL the auth service will redirect users |                                       |
| `auth.redirectURL`                 |          | `URL`                    | Redirect URL to UI after login/logout             |                                       |
| `auth.clientId`                    |          | `String`                 | Client ID                                         |                                       |
| `auth.clientSecret`                |          | `String`                 | Client secret                                     |                                       |
| `auth.rolePath`                    |          | `String`                 | JSON path to extract roles from the token         | `"$.roles[*]"`                        |
| **`ControlPlaneConfig`**           |          |                          |                                                   |                                       |
| `controlPlane`                     | Yes      | `ControlPlaneConfig`     | Control plane configuration                       |                                       |
| `controlPlane.dataPlaneEndpoint`   | Yes      | `URL`                    | Data plane management endpoint                    |                                       |
| `controlPlane.managementEndpoint`  | Yes      | `URL`                    | Control plane management endpoint                 |                                       |
| `controlPlane.controlEndpoint`     | Yes      | `URL`                    | Public control plane endpoint                     |                                       |
| `controlPlane.initializationDelay` |          | `Number`                 | Initialization delay in milliseconds              | `5000`                                |
| `controlPlane.title`               |          | `String`                 | Data Plane title                                  | `"Analytics Data Plane - vundefined"` |
| `dataset`                          |          | `Array`                  | Dataset configuration                             |                                       |
| **`LoggingConfig`**                |          |                          |                                                   |                                       |
| `logging`                          |          | `LoggingConfig`          | Logging configuration                             |                                       |
| `logging.debug`                    |          | `Boolean`                | Enable debug request logging                      |                                       |
| **`FilesConfig`**                  |          |                          |                                                   |                                       |
| `files`                            |          | `FilesConfig`            | Files configuration                               |                                       |
| `files.path`                       |          | `String`                 | Path to store uploaded files                      | `"/uploads"`                          |
| `files.pvcName`                    |          | `String`                 | Persistent volume claim name for file storage     |                                       |
| **`RuntimeConfig`**                |          |                          |                                                   |                                       |
| `runtime`                          | Yes      | `RuntimeConfig`          | Runtime configuration                             |                                       |
| `runtime.color`                    |          | `String`                 | Primary UI color                                  | `"#3B8BF6"`                           |
| `runtime.lightThemeUrl`            |          | `String`                 | Light theme logo URL                              |                                       |
| `runtime.darkThemeUrl`             |          | `String`                 | Dark theme logo URL                               |                                       |
| **`KubernetesConfig`**             |          |                          |                                                   |                                       |
| `kubernetesConfig`                 |          | `KubernetesConfig`       | Kubernetes configuration                          |                                       |
| `kubernetesConfig.namespace`       |          | `String`                 | Kubernetes namespace                              | `"default"`                           |
