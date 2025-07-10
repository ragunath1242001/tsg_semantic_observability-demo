# Configuration Reference

This document provides a complete reference for configuring the TSG CLI tool, including all available options for both ecosystem and participant deployments.

## Configuration Files

The TSG CLI uses YAML configuration files to define deployment parameters:

- **`ecosystem.yaml`** - For deploying complete dataspace ecosystems with multiple participants
- **`participant.yaml`** - For deploying single participants to join existing dataspaces

## Schema Overview

Both configuration types follow a specific schema validated by the CLI. The configuration is based on TypeScript models that ensure proper validation.

## Configuration

Configuration for the CLI tool starts either at [Ecosystem](#ecosystem-ecosystemyaml) or [SingleParticipant](#singleparticipant-participantyaml).

### Ecosystem (`ecosystem.yaml`)

| Name           | Data Type                            | Required | Explanation                          | Default |
| -------------- | ------------------------------------ | -------- | ------------------------------------ | ------- |
| `general`      | [General](#general)                  | Yes      | General configuration properties     |         |
| `applications` | [Applications](#applications)        |          | Application configuration properties |         |
| `participants` | [`Array<Participant>`](#participant) | Yes      | Participant configuration            |         |

### SingleParticipant (`participant.yaml`)

| Name           | Data Type                     | Required | Explanation                          | Default |
| -------------- | ----------------------------- | -------- | ------------------------------------ | ------- |
| `general`      | [General](#general)           | Yes      | General configuration properties     |         |
| `applications` | [Applications](#applications) |          | Application configuration properties |         |
| `participant`  | [Participant](#participant)   | Yes      | Participant configuration            |         |

### General

| Name              | Data Type | Required | Explanation                                                                                             | Default |
| ----------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `namespace`       | String    | Yes      | Kubernetes namespace used for deployments. Must match pattern `[a-zA-Z-]+` (alphanumeric with hyphens)  |         |
| `username`        | String    | Yes      | Default admin username                                                                                  |         |
| `password`        | String    | Yes      | Default admin password                                                                                  |         |
| `authorityDomain` | String    | Yes      | Domain name of the authority, either the one deployed as participant or an external dataspace authority |         |
| `credentialType`  | String    | Yes      | Credential type name                                                                                    |         |

### Applications

| Name           | Data Type                                  | Required | Explanation                                                        | Default |
| -------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------ | ------- |
| `postgres`     | [Application](#application)                |          | Postgres [application](#application), defaults to Bitnami Postgres |         |
| `ssoBridge`    | [Application](#application)                |          | SSO Bridge [application](#application)                             |         |
| `wallet`       | [Application](#application)                |          | TSG Wallet                                                         |         |
| `controlPlane` | [Application](#application)                |          | TSG Control Plane                                                  |         |
| `dataPlanes`   | [`Map<String, Application>`](#application) |          | Data plane applications                                            |         |

### Application

| Name               | Data Type | Required | Explanation                         | Default                    |
| ------------------ | --------- | -------- | ----------------------------------- | -------------------------- |
| `chartVersion`     | String    |          | Helm chart version                  |                            |
| `chartName`        | String    |          | Helm chart name                     |                            |
| `developmentChart` | Boolean   |          | Use TSG development Helm repository | `false`                    |
| `imageTag`         | String    |          | Docker image tag                    |                            |
| `imageRepository`  | String    |          | Docker image repository             |                            |

### Participant

| Name                | Data Type                              | Required                  | Explanation                                                                                                                                                   | Default      |
| ------------------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `host`              | String                                 | Yes                       | Domain name, used for host ingress paths                                                                                                                      |              |
| `id`                | String                                 | Yes                       | Participant identifier, used for identifier for instances                                                                                                     |              |
| `name`              | String                                 | Yes                       | Participant name, used for metadata                                                                                                                           |              |
| `routing`           | `"path"` \| `"subdomain"`              |                           | Path-based or subdomain-based routing for services. Must be either "path" or "subdomain"                                                                      | `"path"`     |
| `hasControlPlane`   | Boolean                                |                           | Flag whether a control plane should be deployed                                                                                                               | `false`      |
| `hasTestService`    | Boolean                                |                           | Flag whether a test HTTP data plane should be deployed with a test service                                                                                    | `false`      |
| `hasDebugLogging`   | Boolean                                |                           | Flag whether to enable debug logging for the services                                                                                                         | `false`      |
| `issuer`            | Boolean                                |                           | Flag whether this participant is an issuer of credentials. Should be used only for a dataspace authority                                                      | `false`      |
| `document`          | Object                                 | Yes if `issuer` is `true` | JSON-LD document for credentials that will be issued. Required when `issuer: true`                                                                            |              |
| `schema`            | Object                                 | Yes if `issuer` is `true` | JSON schema for credentials that will be issued. Required when `issuer: true`                                                                                 |              |
| `credentialSubject` | Object                                 |                           | Credential subject data for participants                                                                                                                      |              |
| `preAuthorizedCode` | String                                 |                           | Pre-authorized code for requesting a credential via OID4VCI. Use only when also deploying a dataspace authority or when a code is received from the issuer    |              |
| `dataPlanes`        | [`Map<String, DataPlane>`](#dataplane) |                           | Data planes that will be configured for this participant                                                                                                      | `new Map()` |

### DataPlane

| Name           | Data Type | Required | Explanation                                                                                             | Default |
| -------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------- | ------- |
| `type`         | String    |          | Data plane type, only required when type does not match key                                             |         |
| `tsgDataPlane` | Boolean   |          | Flag whether data plane configuration following the TSG data planes should be generated                 | `true`  |
| `postgres`     | Boolean   |          | Flag whether a postgres database and credentials should be made                                         | `true`  |
| `subPath`      | String    |          | Subpath to use for this data plane if different from key and if participant routing is `"path"`         |         |
| `dnsPrefix`    | String    |          | DNS prefix to use for this data plane if different from key and if participant routing is `"subdomain"` |         |
| `config`       | Object    |          | Specific data plane config                                                                              |         |

## Troubleshooting

### Common Configuration Errors

**Invalid namespace format**:
```yaml
general:
  namespace: "my-namespace"  # ✅ Valid: lowercase with hyphens
  namespace: "My Namespace"  # ❌ Invalid: spaces and uppercase
```

**Missing required fields for issuers**:
```yaml
participant:
  issuer: true
  document: {...}  # ✅ Required when issuer: true
  schema: {...}    # ✅ Required when issuer: true
```

For more troubleshooting help, see the [CLI README](./README.md#troubleshooting) and [Getting Started Guide](../../getting-started.md).
