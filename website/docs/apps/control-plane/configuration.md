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
| `db`                                               | Yes      | `DatabaseConfig`                           | Database configuration                            |                           |
| `db.type`                                          | Yes      | `"sqlite" \| "postgres"`                   | Type of database                                  |                           |
| `db.database`                                      | Yes      | `String`                                   | Name of the database                              |                           |
| `db.synchronize`                                   |          | `Boolean`                                  | Synchronize database schema                       |                           |
| `db{type=sqlite}`                                  | Yes      | `SQLiteConfig`                             | Database configuration                            |                           |
| `db{type=sqlite}.type`                             |          | `"sqlite" \| "postgres"`                   | Type of database                                  | `"sqlite"`                |
| `db{type=sqlite}.database`                         | Yes      | `String`                                   | Name of the database                              |                           |
| `db{type=sqlite}.synchronize`                      |          | `Boolean`                                  | Synchronize database schema                       |                           |
| `db{type=postgres}`                                | Yes      | `PostgresConfig`                           | Database configuration                            |                           |
| `db{type=postgres}.host`                           | Yes      | `String`                                   | Host of the database                              |                           |
| `db{type=postgres}.port`                           | Yes      | `Number`                                   | Port of the database                              |                           |
| `db{type=postgres}.username`                       | Yes      | `String`                                   | Username of the database                          |                           |
| `db{type=postgres}.password`                       | Yes      | `String`                                   | Password of the database                          |                           |
| `db{type=postgres}.ssl`                            |          | `Unknown`                                  | SSL configuration of the database                 |                           |
| `db{type=postgres}.type`                           |          | `"sqlite" \| "postgres"`                   | Type of database                                  | `"postgres"`              |
| `db{type=postgres}.database`                       | Yes      | `String`                                   | Name of the database                              |                           |
| `db{type=postgres}.synchronize`                    |          | `Boolean`                                  | Synchronize database schema                       |                           |
| **`ServerConfig`**                                 |          |                                            |                                                   |                           |
| `server`                                           |          | `ServerConfig`                             | Server configuration                              |                           |
| `server.listen`                                    |          | `String`                                   | IP address the server listens on                  | `"0.0.0.0"`               |
| `server.port`                                      |          | `Number`                                   | Port the server listens on                        | `3000`                    |
| `server.publicDomain`                              |          | `String`                                   | Public domain of the server                       | `"localhost"`             |
| `server.publicAddress`                             |          | `String`                                   | Public address of the server                      | `"http://localhost:3000"` |
| `server.subPath`                                   |          | `String`                                   | Sub path of the server                            |                           |
| **`AuthConfig`**                                   |          |                                            |                                                   |                           |
| `auth`                                             | Yes      | `AuthConfig`                               | Management authentication configuration           |                           |
| `auth.enabled`                                     |          | `Boolean`                                  | Enable authentication                             | `true`                    |
| `auth.openIdConfigurationURL`                      |          | `String`                                   | OpenID configuration URL                          |                           |
| `auth.callbackURL`                                 |          | `URL`                                      | Callback URL the auth service will redirect users |                           |
| `auth.redirectURL`                                 |          | `URL`                                      | Redirect URL to UI after login/logout             |                           |
| `auth.clientId`                                    |          | `String`                                   | Client ID                                         |                           |
| `auth.clientSecret`                                |          | `String`                                   | Client secret                                     |                           |
| `auth.rolePath`                                    |          | `String`                                   | JSON path to extract roles from the token         | `"$.roles[*]"`            |
| **`RegistryConfig`**                               |          |                                            |                                                   |                           |
| `registry`                                         | Yes      | `RegistryConfig`                           | Registry configuration                            |                           |
| `registry.useRegistry`                             | Yes      | `Boolean`                                  | Use registry to crawl catalogs                    |                           |
| `registry.registryUrl`                             |          | `String`                                   | URL of the registry                               |                           |
| `registry.registryDid`                             |          | `String`                                   | DID of the registry                               |                           |
| `registry.registryIntervalInMilliseconds`          |          | `Number`                                   | Interval in milliseconds to fetch registry        | `30000`                   |
| **`IamConfig`**                                    |          |                                            |                                                   |                           |
| `iam`                                              | Yes      | `IamConfig`                                | IAM wallet configuration                          |                           |
| `iam.type`                                         | Yes      | `"tsg" \| "dev"`                           | Type of IAM service                               |                           |
| `iam.didId`                                        | Yes      | `String`                                   | DID identifier of the IAM service                 |                           |
| `iam.protocol`                                     |          | `String`                                   | Protocol of the IAM service                       | `"DCP"`                   |
| `iam.version`                                      |          | `String`                                   | Protocol of the IAM service                       | `"1.0"`                   |
| `iam.profile`                                      |          | `String`                                   | Profiles of the IAM service                       | `["vc11-bssl/jsonld"]`    |
| `iam{type=dev}`                                    | Yes      | `DevWalletConfig`                          | IAM wallet configuration                          |                           |
| `iam{type=dev}.type`                               |          | `"tsg" \| "dev"`                           | Type of IAM service                               | `"dev"`                   |
| `iam{type=dev}.didId`                              | Yes      | `String`                                   | DID identifier of the IAM service                 |                           |
| `iam{type=dev}.protocol`                           |          | `String`                                   | Protocol of the IAM service                       | `"DCP"`                   |
| `iam{type=dev}.version`                            |          | `String`                                   | Protocol of the IAM service                       | `"1.0"`                   |
| `iam{type=dev}.profile`                            |          | `String`                                   | Profiles of the IAM service                       | `["vc11-bssl/jsonld"]`    |
| `iam{type=tsg}`                                    | Yes      | `TsgWalletConfig`                          | IAM wallet configuration                          |                           |
| `iam{type=tsg}.walletUrl`                          | Yes      | `URL`                                      | URL of the wallet management endpoint             |                           |
| `iam{type=tsg}.siopUrl`                            | Yes      | `URL`                                      | URL of the SIOP token endpoint                    |                           |
| `iam{type=tsg}.verifyUrl`                          | Yes      | `URL`                                      | URL of the verification endpoint                  |                           |
| `iam{type=tsg}.typeFilter`                         |          | `String`                                   | Credential type filter used as default            |                           |
| `iam{type=tsg}.issuerFilter`                       |          | `String`                                   | Issuer filter used as default                     |                           |
| `iam{type=tsg}.customFields`                       |          | `Array`                                    | Custom presentation definition fields             |                           |
| `iam{type=tsg}.type`                               |          | `"tsg" \| "dev"`                           | Type of IAM service                               | `"tsg"`                   |
| `iam{type=tsg}.didId`                              | Yes      | `String`                                   | DID identifier of the IAM service                 |                           |
| `iam{type=tsg}.protocol`                           |          | `String`                                   | Protocol of the IAM service                       | `"DCP"`                   |
| `iam{type=tsg}.version`                            |          | `String`                                   | Protocol of the IAM service                       | `"1.0"`                   |
| `iam{type=tsg}.profile`                            |          | `String`                                   | Profiles of the IAM service                       | `["vc11-bssl/jsonld"]`    |
| **`InitCatalog`**                                  |          |                                            |                                                   |                           |
| `initCatalog`                                      | Yes      | `InitCatalog`                              | Initial catalog configuration                     |                           |
| `initCatalog.participantId`                        | Yes      | `String`                                   | Participant id of the catalog                     |                           |
| `initCatalog.creator`                              | Yes      | `String`                                   | Creator of the catalog                            |                           |
| `initCatalog.publisher`                            | Yes      | `String`                                   | Publisher of the catalog                          |                           |
| `initCatalog.title`                                | Yes      | `String`                                   | Title of the catalog                              |                           |
| `initCatalog.description`                          | Yes      | `String`                                   | Description of the catalog                        |                           |
| `initCatalog.datasets`                             |          | `String`                                   | Serialized initial datasets                       |                           |
| **`PolicyConfig`**                                 |          |                                            |                                                   |                           |
| `defaultPolicy`                                    |          | `PolicyConfig`                             | Default policy configuration                      |                           |
| `defaultPolicy.type`                               |          | `"rules" \| "manual"`                      | Definition type of the policy                     | `"rules"`                 |
| **`PolicyRuleConfig`**                             |          |                                            |                                                   |                           |
| `defaultPolicy.permissions`                        |          | `PolicyRuleConfig[]`                       | Permissions of the policy                         |                           |
| `defaultPolicy.permissions[].action`               | Yes      | `String`                                   | Action of the rule                                |                           |
| **`RuleConstraintConfig`**                         |          |                                            |                                                   |                           |
| `defaultPolicy.permissions[].constraints`          |          | `RuleConstraintConfig[]`                   | Constraints of the rule                           |                           |
| `defaultPolicy.permissions[].constraints[].type`   | Yes      | `String`                                   | Type of the constraint                            |                           |
| `defaultPolicy.permissions[].constraints[].value`  | Yes      | `String`                                   | Value of the constraint                           |                           |
| **`PolicyRuleConfig`**                             |          |                                            |                                                   |                           |
| `defaultPolicy.prohibitions`                       |          | `PolicyRuleConfig[]`                       | Prohibitions of the policy                        |                           |
| `defaultPolicy.prohibitions[].action`              | Yes      | `String`                                   | Action of the rule                                |                           |
| **`RuleConstraintConfig`**                         |          |                                            |                                                   |                           |
| `defaultPolicy.prohibitions[].constraints`         |          | `RuleConstraintConfig[]`                   | Constraints of the rule                           |                           |
| `defaultPolicy.prohibitions[].constraints[].type`  | Yes      | `String`                                   | Type of the constraint                            |                           |
| `defaultPolicy.prohibitions[].constraints[].value` | Yes      | `String`                                   | Value of the constraint                           |                           |
| `defaultPolicy.raw`                                |          | `Object`                                   | Raw ODRL policy                                   |                           |
| **`RuntimeConfig`**                                |          |                                            |                                                   |                           |
| `runtime`                                          | Yes      | `RuntimeConfig`                            | Runtime configuration                             |                           |
| `runtime.controlPlaneInteractions`                 |          | `"automatic" \| "semi-manual" \| "manual"` | Mode of control plane interactions                | `"automatic"`             |
| `runtime.color`                                    |          | `String`                                   | Primary UI color                                  | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`                            |          | `String`                                   | Light theme logo URL                              |                           |
| `runtime.darkThemeUrl`                             |          | `String`                                   | Dark theme logo URL                               |                           |
