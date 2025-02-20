---
[comment]: # (This file is auto generated)
hide_table_of_contents: true
---
# Configuration

In this section, the configuration of the http data plane is explained. Configuration is used based on a `config.yaml` file which should be placed in the `apps/backend` folder. This `config.yaml` file is loaded when booting the application. The values get type checked, and it gives a clear error message if there is a configuration field missing or provided incorrectly. Next to the `config.yaml` file, you can also set environment variables. These override the values that are listed in the `config.yaml` file.

## Databases

By default, the development database is sqlite. We use postgres databases for production type instances of the http data planes.

## Authentication

Authentication for frontend services can be done via OAuth. This helps users who need to login to several components to authenticate themselves faster. The data plane is tested against the SSO Bridge, with an Helm chart provided alongside the Helm chart of the data plane, but other OAuth services should be usable (e.g. Keycloak, or hosted OAuth services).

## Configuration parameters
| Key                                                                      | Required | Type                               | Description                                         | Default                   |
| ------------------------------------------------------------------------ | -------- | ---------------------------------- | --------------------------------------------------- | ------------------------- |
| **`DatabaseConfig`**                                                     |          |                                    |                                                     |                           |
| `db`                                                                     |          | `DatabaseConfig`                   | Database configuration                              |                           |
| `db.type`                                                                |          | `"sqlite" \| "postgres"`           | Type of database                                    |                           |
| `db.database`                                                            |          | `String`                           | Name of the database                                |                           |
| `db.synchronize`                                                         | Yes      | `Boolean`                          | Synchronize database schema                         |                           |
| `db{type=sqlite}`                                                        |          | `SQLiteConfig`                     | Database configuration                              |                           |
| `db{type=sqlite}.type`                                                   |          | `"sqlite" \| "postgres"`           | Type of database                                    | `"sqlite"`                |
| `db{type=sqlite}.database`                                               |          | `String`                           | Name of the database                                |                           |
| `db{type=sqlite}.synchronize`                                            | Yes      | `Boolean`                          | Synchronize database schema                         |                           |
| `db{type=postgres}`                                                      |          | `PostgresConfig`                   | Database configuration                              |                           |
| `db{type=postgres}.host`                                                 |          | `String`                           | Host of the database                                |                           |
| `db{type=postgres}.port`                                                 |          | `Number`                           | Port of the database                                |                           |
| `db{type=postgres}.username`                                             |          | `String`                           | Username of the database                            |                           |
| `db{type=postgres}.password`                                             |          | `String`                           | Password of the database                            |                           |
| `db{type=postgres}.ssl`                                                  | Yes      | `Unknown`                          | SSL configuration of the database                   |                           |
| `db{type=postgres}.type`                                                 |          | `"sqlite" \| "postgres"`           | Type of database                                    | `"postgres"`              |
| `db{type=postgres}.database`                                             |          | `String`                           | Name of the database                                |                           |
| `db{type=postgres}.synchronize`                                          | Yes      | `Boolean`                          | Synchronize database schema                         |                           |
| **`ServerConfig`**                                                       |          |                                    |                                                     |                           |
| `server`                                                                 | Yes      | `ServerConfig`                     | Server configuration                                |                           |
| `server.listen`                                                          | Yes      | `String`                           | IP address the server listens on                    | `"0.0.0.0"`               |
| `server.port`                                                            | Yes      | `Number`                           | Port the server listens on                          | `3000`                    |
| `server.publicDomain`                                                    | Yes      | `String`                           | Public domain of the server                         | `"localhost"`             |
| `server.publicAddress`                                                   | Yes      | `String`                           | Public address of the server                        | `"http://localhost:3000"` |
| `server.subPath`                                                         | Yes      | `String`                           | Sub path of the server                              |                           |
| **`AuthConfig`**                                                         |          |                                    |                                                     |                           |
| `auth`                                                                   |          | `AuthConfig`                       | Management authentication configuration             |                           |
| `auth.enabled`                                                           |          | `Boolean`                          | Enable authentication                               | `true`                    |
| `auth.openIdConfigurationURL`                                            | Yes      | `String`                           | OpenID configuration URL                            |                           |
| `auth.callbackURL`                                                       | Yes      | `URL`                              | Callback URL the auth service will redirect users   |                           |
| `auth.redirectURL`                                                       | Yes      | `URL`                              | Redirect URL to UI after login/logout               |                           |
| `auth.clientId`                                                          | Yes      | `String`                           | Client ID                                           |                           |
| `auth.clientSecret`                                                      | Yes      | `String`                           | Client secret                                       |                           |
| `auth.rolePath`                                                          | Yes      | `String`                           | JSON path to extract roles from the token           | `"$.roles[*]"`            |
| **`ControlPlaneConfig`**                                                 |          |                                    |                                                     |                           |
| `controlPlane`                                                           |          | `ControlPlaneConfig`               | Control plane configuration                         |                           |
| `controlPlane.dataPlaneEndpoint`                                         |          | `URL`                              | Data plane management endpoint                      |                           |
| `controlPlane.managementEndpoint`                                        |          | `URL`                              | Control plane management endpoint                   |                           |
| `controlPlane.controlEndpoint`                                           |          | `URL`                              | Public control plane endpoint                       |                           |
| `controlPlane.initializationDelay`                                       |          | `Number`                           | Initialization delay in milliseconds                | `5000`                    |
| **`DatasetConfig`**                                                      |          |                                    |                                                     |                           |
| `dataset`                                                                | Yes      | `DatasetConfig`                    | Dataset configuration                               |                           |
| `dataset.type`                                                           |          | `"versioned" \| "collection"`      | Type of the dataset configuration                   |                           |
| `dataset{type=versioned}`                                                | Yes      | `VersionedDatasetConfig`           | Dataset configuration                               |                           |
| `dataset{type=versioned}.id`                                             | Yes      | `String`                           | ID of the dataset                                   |                           |
| `dataset{type=versioned}.title`                                          |          | `String`                           | Title of the dataset                                |                           |
| `dataset{type=versioned}.baseSemanticModelRef`                           | Yes      | `URL`                              | Base semantic model reference of the dataset        |                           |
| **`VersionConfig`**                                                      |          |                                    |                                                     |                           |
| `dataset{type=versioned}.versions`                                       |          | `VersionConfig[]`                  | Versions of the dataset                             |                           |
| `dataset{type=versioned}.versions[].id`                                  | Yes      | `String`                           | Version ID                                          |                           |
| `dataset{type=versioned}.versions[].version`                             |          | `String`                           | Version number                                      |                           |
| `dataset{type=versioned}.versions[].semanticModelRef`                    | Yes      | `URL`                              | Semantic model reference of the version             |                           |
| `dataset{type=versioned}.versions[].authorization`                       | Yes      | `String`                           | Authorization header required for the backend       |                           |
| **`DistributionConfig`**                                                 |          |                                    |                                                     |                           |
| `dataset{type=versioned}.versions[].distributions`                       |          | `DistributionConfig[]`             | Distributions of the version                        |                           |
| `dataset{type=versioned}.versions[].distributions[].mediaType`           | Yes      | `String`                           | Media type of the distribution                      |                           |
| `dataset{type=versioned}.versions[].distributions[].schemaRef`           | Yes      | `URL`                              | Schema reference of the distribution                |                           |
| `dataset{type=versioned}.versions[].distributions[].openApiSpecRef`      | Yes      | `URL`                              | OpenAPI specification reference of the distribution |                           |
| `dataset{type=versioned}.versions[].distributions[].backendUrl`          |          | `URL`                              | Backend URL of the distribution                     |                           |
| `dataset{type=versioned}.currentVersion`                                 |          | `String`                           | Current version of the dataset                      |                           |
| **`PolicyConfig`**                                                       |          |                                    |                                                     |                           |
| `dataset{type=versioned}.policy`                                         | Yes      | `PolicyConfig`                     | Policy of the dataset                               |                           |
| `dataset{type=versioned}.policy.type`                                    |          | `"default" \| "rules" \| "manual"` | Definition type of the policy                       | `"default"`               |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `dataset{type=versioned}.policy.permissions`                             | Yes      | `PolicyRuleConfig[]`               | Permissions of the policy                           |                           |
| `dataset{type=versioned}.policy.permissions[].action`                    |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `dataset{type=versioned}.policy.permissions[].constraints`               | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `dataset{type=versioned}.policy.permissions[].constraints[].type`        |          | `String`                           | Type of the constraint                              |                           |
| `dataset{type=versioned}.policy.permissions[].constraints[].value`       |          | `String`                           | Value of the constraint                             |                           |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `dataset{type=versioned}.policy.prohibitions`                            | Yes      | `PolicyRuleConfig[]`               | Prohibitions of the policy                          |                           |
| `dataset{type=versioned}.policy.prohibitions[].action`                   |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `dataset{type=versioned}.policy.prohibitions[].constraints`              | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `dataset{type=versioned}.policy.prohibitions[].constraints[].type`       |          | `String`                           | Type of the constraint                              |                           |
| `dataset{type=versioned}.policy.prohibitions[].constraints[].value`      |          | `String`                           | Value of the constraint                             |                           |
| `dataset{type=versioned}.policy.raw`                                     | Yes      | `Object`                           | Raw serialized ODRL offer                           |                           |
| `dataset{type=versioned}.type`                                           |          | `"versioned" \| "collection"`      | Type of the dataset configuration                   | `"versioned"`             |
| `dataset{type=collection}`                                               | Yes      | `CollectionDatasetConfig`          | Dataset configuration                               |                           |
| `dataset{type=collection}.baseSemanticModelRef`                          | Yes      | `URL`                              | Base semantic model reference of the dataset        |                           |
| **`PolicyConfig`**                                                       |          |                                    |                                                     |                           |
| `dataset{type=collection}.basePolicy`                                    | Yes      | `PolicyConfig`                     | Base policy of the dataset                          |                           |
| `dataset{type=collection}.basePolicy.type`                               |          | `"default" \| "rules" \| "manual"` | Definition type of the policy                       | `"default"`               |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `dataset{type=collection}.basePolicy.permissions`                        | Yes      | `PolicyRuleConfig[]`               | Permissions of the policy                           |                           |
| `dataset{type=collection}.basePolicy.permissions[].action`               |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `dataset{type=collection}.basePolicy.permissions[].constraints`          | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `dataset{type=collection}.basePolicy.permissions[].constraints[].type`   |          | `String`                           | Type of the constraint                              |                           |
| `dataset{type=collection}.basePolicy.permissions[].constraints[].value`  |          | `String`                           | Value of the constraint                             |                           |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `dataset{type=collection}.basePolicy.prohibitions`                       | Yes      | `PolicyRuleConfig[]`               | Prohibitions of the policy                          |                           |
| `dataset{type=collection}.basePolicy.prohibitions[].action`              |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `dataset{type=collection}.basePolicy.prohibitions[].constraints`         | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `dataset{type=collection}.basePolicy.prohibitions[].constraints[].type`  |          | `String`                           | Type of the constraint                              |                           |
| `dataset{type=collection}.basePolicy.prohibitions[].constraints[].value` |          | `String`                           | Value of the constraint                             |                           |
| `dataset{type=collection}.basePolicy.raw`                                | Yes      | `Object`                           | Raw serialized ODRL offer                           |                           |
| `dataset{type=collection}.authorization`                                 | Yes      | `String`                           | Authorization header required for the backend       |                           |
| `dataset{type=collection}.mediaType`                                     | Yes      | `String`                           | Media type of the dataset                           |                           |
| `dataset{type=collection}.schemaRef`                                     | Yes      | `URL`                              | Schema reference of the dataset                     |                           |
| `dataset{type=collection}.openApiSpecRef`                                | Yes      | `URL`                              | OpenAPI specification reference of the dataset      |                           |
| `dataset{type=collection}.type`                                          |          | `"versioned" \| "collection"`      | Type of the dataset configuration                   | `"collection"`            |
| **`DatasetItem`**                                                        |          |                                    |                                                     |                           |
| `initCollection`                                                         | Yes      | `DatasetItem[]`                    | Initial collection configuration                    |                           |
| `initCollection[].id`                                                    | Yes      | `String`                           | ID of the dataset item                              |                           |
| `initCollection[].title`                                                 |          | `String`                           | Title of the dataset item                           |                           |
| `initCollection[].version`                                               |          | `String`                           | Version of the dataset item                         |                           |
| `initCollection[].backendUrl`                                            |          | `URL`                              | Base semantic model reference of the dataset item   |                           |
| `initCollection[].authorization`                                         | Yes      | `String`                           | Authorization header required for the backend       |                           |
| `initCollection[].mediaType`                                             | Yes      | `String`                           | Media type of the dataset item                      |                           |
| `initCollection[].schemaRef`                                             | Yes      | `URL`                              | Schema reference of the dataset item                |                           |
| `initCollection[].openApiSpecRef`                                        | Yes      | `URL`                              | OpenAPI specification reference of the dataset      |                           |
| **`PolicyConfig`**                                                       |          |                                    |                                                     |                           |
| `initCollection[].policy`                                                | Yes      | `PolicyConfig`                     | Policy of the dataset item                          |                           |
| `initCollection[].policy.type`                                           |          | `"default" \| "rules" \| "manual"` | Definition type of the policy                       | `"default"`               |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `initCollection[].policy.permissions`                                    | Yes      | `PolicyRuleConfig[]`               | Permissions of the policy                           |                           |
| `initCollection[].policy.permissions[].action`                           |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `initCollection[].policy.permissions[].constraints`                      | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `initCollection[].policy.permissions[].constraints[].type`               |          | `String`                           | Type of the constraint                              |                           |
| `initCollection[].policy.permissions[].constraints[].value`              |          | `String`                           | Value of the constraint                             |                           |
| **`PolicyRuleConfig`**                                                   |          |                                    |                                                     |                           |
| `initCollection[].policy.prohibitions`                                   | Yes      | `PolicyRuleConfig[]`               | Prohibitions of the policy                          |                           |
| `initCollection[].policy.prohibitions[].action`                          |          | `String`                           | Action of the rule                                  |                           |
| **`RuleConstraintConfig`**                                               |          |                                    |                                                     |                           |
| `initCollection[].policy.prohibitions[].constraints`                     | Yes      | `RuleConstraintConfig[]`           | Constraints of the rule                             |                           |
| `initCollection[].policy.prohibitions[].constraints[].type`              |          | `String`                           | Type of the constraint                              |                           |
| `initCollection[].policy.prohibitions[].constraints[].value`             |          | `String`                           | Value of the constraint                             |                           |
| `initCollection[].policy.raw`                                            | Yes      | `Object`                           | Raw serialized ODRL offer                           |                           |
| **`LoggingConfig`**                                                      |          |                                    |                                                     |                           |
| `logging`                                                                | Yes      | `LoggingConfig`                    | Logging configuration                               |                           |
| `logging.debug`                                                          | Yes      | `Boolean`                          | Enable debug request logging                        |                           |
| **`RuntimeConfig`**                                                      |          |                                    |                                                     |                           |
| `runtime`                                                                |          | `RuntimeConfig`                    | Runtime configuration                               |                           |
| `runtime.color`                                                          |          | `String`                           | Primary UI color                                    | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`                                                  | Yes      | `String`                           | Light theme logo URL                                |                           |
| `runtime.darkThemeUrl`                                                   | Yes      | `String`                           | Dark theme logo URL                                 |                           |
