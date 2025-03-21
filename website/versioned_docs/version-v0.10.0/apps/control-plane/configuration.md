---
[comment]: # (This file is auto generated)
hide_table_of_contents: true
---
# Configuration

In this section, the configuration of the control plane is explained. Configuration is used based on a `config.yaml` file which should be placed in the `apps/backend/src` folder. This `config.yaml` file is loaded when booting the application. The values get type checked, and it gives a clear error message if there is a configuration field missing or provided incorrectly. Next to the `config.yaml` file, you can also set environment variables. These override the values that are listed in the `config.yaml` file.

## Databases

By default, the development database is sqlite. We use postgres databases for production type instances of the control planes.

## Authentication

Authentication for frontend services can be done via the SSO Bridge. This helps users who need to login to several components to authenticate themselves faster.

## Configuration parameters

| Key                                                | Required | Type                                       | Description                                       | Default                   |
| -------------------------------------------------- | -------- | ------------------------------------------ | ------------------------------------------------- | ------------------------- |
| **`DatabaseConfig`**                               |          |                                            |                                                   |                           |
| `db`                                               |          | `DatabaseConfig`                           | Database configuration                            |                           |
| `db.type`                                          |          | `"sqlite" \| "postgres"`                   | Type of database                                  |                           |
| `db.database`                                      |          | `String`                                   | Name of the database                              |                           |
| `db.synchronize`                                   | Yes      | `Boolean`                                  | Synchronize database schema                       |                           |
| `db{type=sqlite}`                                  |          | `SQLiteConfig`                             | Database configuration                            |                           |
| `db{type=sqlite}.type`                             |          | `"sqlite" \| "postgres"`                   | Type of database                                  | `"sqlite"`                |
| `db{type=sqlite}.database`                         |          | `String`                                   | Name of the database                              |                           |
| `db{type=sqlite}.synchronize`                      | Yes      | `Boolean`                                  | Synchronize database schema                       |                           |
| `db{type=postgres}`                                |          | `PostgresConfig`                           | Database configuration                            |                           |
| `db{type=postgres}.host`                           |          | `String`                                   | Host of the database                              |                           |
| `db{type=postgres}.port`                           |          | `Number`                                   | Port of the database                              |                           |
| `db{type=postgres}.username`                       |          | `String`                                   | Username of the database                          |                           |
| `db{type=postgres}.password`                       |          | `String`                                   | Password of the database                          |                           |
| `db{type=postgres}.ssl`                            | Yes      | `Unknown`                                  | SSL configuration of the database                 |                           |
| `db{type=postgres}.type`                           |          | `"sqlite" \| "postgres"`                   | Type of database                                  | `"postgres"`              |
| `db{type=postgres}.database`                       |          | `String`                                   | Name of the database                              |                           |
| `db{type=postgres}.synchronize`                    | Yes      | `Boolean`                                  | Synchronize database schema                       |                           |
| **`ServerConfig`**                                 |          |                                            |                                                   |                           |
| `server`                                           | Yes      | `ServerConfig`                             | Server configuration                              |                           |
| `server.listen`                                    | Yes      | `String`                                   | IP address the server listens on                  | `"0.0.0.0"`               |
| `server.port`                                      | Yes      | `Number`                                   | Port the server listens on                        | `3000`                    |
| `server.publicDomain`                              | Yes      | `String`                                   | Public domain of the server                       | `"localhost"`             |
| `server.publicAddress`                             | Yes      | `String`                                   | Public address of the server                      | `"http://localhost:3000"` |
| `server.subPath`                                   | Yes      | `String`                                   | Sub path of the server                            |                           |
| **`AuthConfig`**                                   |          |                                            |                                                   |                           |
| `auth`                                             |          | `AuthConfig`                               | Management authentication configuration           |                           |
| `auth.enabled`                                     |          | `Boolean`                                  | Enable authentication                             | `true`                    |
| `auth.openIdConfigurationURL`                      | Yes      | `String`                                   | OpenID configuration URL                          |                           |
| `auth.callbackURL`                                 | Yes      | `URL`                                      | Callback URL the auth service will redirect users |                           |
| `auth.redirectURL`                                 | Yes      | `URL`                                      | Redirect URL to UI after login/logout             |                           |
| `auth.clientId`                                    | Yes      | `String`                                   | Client ID                                         |                           |
| `auth.clientSecret`                                | Yes      | `String`                                   | Client secret                                     |                           |
| `auth.rolePath`                                    | Yes      | `String`                                   | JSON path to extract roles from the token         | `"$.roles[*]"`            |
| **`RegistryConfig`**                               |          |                                            |                                                   |                           |
| `registry`                                         |          | `RegistryConfig`                           | Registry configuration                            |                           |
| `registry.useRegistry`                             |          | `Boolean`                                  | Use registry to crawl catalogs                    |                           |
| `registry.registryUrl`                             | Yes      | `String`                                   | URL of the registry                               |                           |
| `registry.registryDid`                             | Yes      | `String`                                   | DID of the registry                               |                           |
| `registry.registryIntervalInMilliseconds`          |          | `Number`                                   | Interval in milliseconds to fetch registry        | `30000`                   |
| **`IamConfig`**                                    |          |                                            |                                                   |                           |
| `iam`                                              |          | `IamConfig`                                | IAM wallet configuration                          |                           |
| `iam.type`                                         |          | `"tsg" \| "dev"`                           | Type of IAM service                               |                           |
| `iam.didId`                                        |          | `String`                                   | DID identifier of the IAM service                 |                           |
| `iam{type=dev}`                                    |          | `DevWalletConfig`                          | IAM wallet configuration                          |                           |
| `iam{type=dev}.type`                               |          | `"tsg" \| "dev"`                           | Type of IAM service                               | `"dev"`                   |
| `iam{type=dev}.didId`                              |          | `String`                                   | DID identifier of the IAM service                 |                           |
| `iam{type=tsg}`                                    |          | `TsgWalletConfig`                          | IAM wallet configuration                          |                           |
| `iam{type=tsg}.walletUrl`                          |          | `URL`                                      | URL of the wallet management endpoint             |                           |
| `iam{type=tsg}.siopUrl`                            |          | `URL`                                      | URL of the SIOP token endpoint                    |                           |
| `iam{type=tsg}.verifyUrl`                          |          | `URL`                                      | URL of the verification endpoint                  |                           |
| `iam{type=tsg}.typeFilter`                         | Yes      | `String`                                   | Credential type filter used as default            |                           |
| `iam{type=tsg}.issuerFilter`                       | Yes      | `String`                                   | Issuer filter used as default                     |                           |
| `iam{type=tsg}.customFields`                       | Yes      | `Array`                                    | Custom presentation definition fields             |                           |
| `iam{type=tsg}.type`                               |          | `"tsg" \| "dev"`                           | Type of IAM service                               | `"tsg"`                   |
| `iam{type=tsg}.didId`                              |          | `String`                                   | DID identifier of the IAM service                 |                           |
| **`InitCatalog`**                                  |          |                                            |                                                   |                           |
| `initCatalog`                                      |          | `InitCatalog`                              | Initial catalog configuration                     |                           |
| `initCatalog.creator`                              |          | `String`                                   | Creator of the catalog                            |                           |
| `initCatalog.publisher`                            |          | `String`                                   | Publisher of the catalog                          |                           |
| `initCatalog.title`                                |          | `String`                                   | Title of the catalog                              |                           |
| `initCatalog.description`                          |          | `String`                                   | Description of the catalog                        |                           |
| `initCatalog.datasets`                             | Yes      | `String`                                   | Serialized initial datasets                       |                           |
| **`PolicyConfig`**                                 |          |                                            |                                                   |                           |
| `defaultPolicy`                                    | Yes      | `PolicyConfig`                             | Default policy configuration                      |                           |
| `defaultPolicy.type`                               |          | `"rules" \| "manual"`                      | Definition type of the policy                     | `"rules"`                 |
| **`PolicyRuleConfig`**                             |          |                                            |                                                   |                           |
| `defaultPolicy.permissions`                        | Yes      | `PolicyRuleConfig[]`                       | Permissions of the policy                         |                           |
| `defaultPolicy.permissions[].action`               |          | `String`                                   | Action of the rule                                |                           |
| **`RuleConstraintConfig`**                         |          |                                            |                                                   |                           |
| `defaultPolicy.permissions[].constraints`          | Yes      | `RuleConstraintConfig[]`                   | Constraints of the rule                           |                           |
| `defaultPolicy.permissions[].constraints[].type`   |          | `String`                                   | Type of the constraint                            |                           |
| `defaultPolicy.permissions[].constraints[].value`  |          | `String`                                   | Value of the constraint                           |                           |
| **`PolicyRuleConfig`**                             |          |                                            |                                                   |                           |
| `defaultPolicy.prohibitions`                       | Yes      | `PolicyRuleConfig[]`                       | Prohibitions of the policy                        |                           |
| `defaultPolicy.prohibitions[].action`              |          | `String`                                   | Action of the rule                                |                           |
| **`RuleConstraintConfig`**                         |          |                                            |                                                   |                           |
| `defaultPolicy.prohibitions[].constraints`         | Yes      | `RuleConstraintConfig[]`                   | Constraints of the rule                           |                           |
| `defaultPolicy.prohibitions[].constraints[].type`  |          | `String`                                   | Type of the constraint                            |                           |
| `defaultPolicy.prohibitions[].constraints[].value` |          | `String`                                   | Value of the constraint                           |                           |
| `defaultPolicy.raw`                                | Yes      | `Object`                                   | Raw ODRL policy                                   |                           |
| **`RuntimeConfig`**                                |          |                                            |                                                   |                           |
| `runtime`                                          |          | `RuntimeConfig`                            | Runtime configuration                             |                           |
| `runtime.controlPlaneInteractions`                 |          | `"automatic" \| "semi-manual" \| "manual"` | Mode of control plane interactions                | `"automatic"`             |
| `runtime.color`                                    |          | `String`                                   | Primary UI color                                  | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`                            | Yes      | `String`                                   | Light theme logo URL                              |                           |
| `runtime.darkThemeUrl`                             | Yes      | `String`                                   | Dark theme logo URL                               |                           |
