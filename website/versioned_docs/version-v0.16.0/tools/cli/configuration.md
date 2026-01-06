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

| Name                      | Data Type                                | Required | Explanation                                                                                                                                             | Default              |
| ------------------------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `namespace`               | String                                   | Yes      | Kubernetes namespace used for deployments. Must match pattern `[a-zA-Z-]+` (alphanumeric with hyphens)                                                  |                      |
| `username`                | String                                   | Yes      | Default admin username                                                                                                                                  |                      |
| `password`                | String                                   | Yes      | Default admin password                                                                                                                                  |                      |
| `authorityDomain`         | String                                   | Yes      | Domain name of the authority, either the one deployed as participant or an external dataspace authority                                                 |                      |
| `credentialType`          | String                                   | Yes      | Credential type name                                                                                                                                    |                      |
| `postgresDeploymentMode`  | `"per-participant"` \| `"per-namespace"` |          | PostgreSQL deployment strategy. `per-participant` deploys a database per participant, `per-namespace` deploys a single shared cluster for the namespace | `"per-namespace"`    |
| `postgresInstances`       | Number                                   |          | Number of PostgreSQL instances for shared cluster (per-namespace mode only). Higher values provide better high availability                             | `1`                  |
| `postgresStorageSize`     | String                                   |          | Storage size for shared PostgreSQL cluster (per-namespace mode only). Examples: `"1Gi"`, `"5Gi"`, `"10Gi"`                                            | `"1Gi"`              |

### Applications

| Name           | Data Type                                  | Required | Explanation                                                        | Default |
| -------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------ | ------- |
| `postgres`     | [Application](#application)                |          | PostgreSQL [application](#application) using CloudNativePG         |         |
| `ssoBridge`    | [Application](#application)                |          | SSO Bridge [application](#application)                             |         |
| `wallet`       | [Application](#application)                |          | TSG Wallet                                                         |         |
| `controlPlane` | [Application](#application)                |          | TSG Control Plane                                                  |         |
| `dataPlanes`   | [`Map<String, Application>`](#application) |          | Data plane applications                                            |         |

### Application

| Name               | Data Type                      | Required | Explanation                         | Default          |
| ------------------ | ------------------------------ | -------- | ----------------------------------- | ---------------- |
| `chartVersion`     | String                         |          | Helm chart version                  |                  |
| `chartName`        | String                         |          | Helm chart name                     |                  |
| `developmentChart` | Boolean                        |          | Use TSG development Helm repository | `false`          |
| `imageTag`         | String                         |          | Docker image tag                    |                  |
| `imageRepository`  | String                         |          | Docker image repository             |                  |

### Participant

| Name                 | Data Type                              | Required                  | Explanation                                                                                                                                                           | Default      |
| -------------------  | -------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `host`               | String                                 | Yes                       | Domain name, used for host ingress paths                                                                                                                              |              |
| `id`                 | String                                 | Yes                       | Participant identifier, used for identifier for instances                                                                                                             |              |
| `name`               | String                                 | Yes                       | Participant name, used for metadata                                                                                                                                   |              |
| `routing`            | `"path"` \| `"subdomain"`              |                           | Path-based or subdomain-based routing for services. Must be either "path" or "subdomain"                                                                              | `"path"`     |
| `hasControlPlane`    | Boolean                                |                           | Flag whether a control plane should be deployed                                                                                                                       | `false`      |
| `hasTestService`     | Boolean                                |                           | Flag whether a test HTTP data plane should be deployed with a test service                                                                                            | `false`      |
| `hasDebugLogging`    | Boolean                                |                           | Flag whether to enable debug logging for the services                                                                                                                 | `false`      |
| `issuer`             | Boolean                                |                           | Flag whether this participant is an issuer of credentials. Should be used only for a dataspace authority                                                              | `false`      |
| `credentialSubject`  | Object                                 |                           | Credential subject data for participants                                                                                                                              |              |
| `preAuthorizedCode`  | String                                 |                           | Pre-authorized code for requesting a credential via OID4VCI. Use only when also deploying a dataspace authority or when a code is received from the issuer            |              |
| `config`             | `Map<String, Object>`                  |                           | Custom configuration for the TSG components (`controlPlane`, `ssoBridge`, `wallet`). See also [Providing Custom Configuration](#providing-custom-configuration)       |              |
| `overrides`          | `Map<String, Object>`                  |                           | Custom configuration for the Helm charts. See also [Providing Custom Configuration](#providing-custom-configuration)                                                  |              |
| `dataPlanes`         | [`Map<String, DataPlane>`](#dataplane) |                           | Data planes that will be configured for this participant                                                                                                              |              |

### DataPlane

| Name           | Data Type | Required | Explanation                                                                                                                      | Default |
| -------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `type`         | String    |          | Data plane type, only required when type does not match key                                                                      |         |
| `tsgDataPlane` | Boolean   |          | Flag whether data plane configuration following the TSG data planes should be generated                                          | `true`  |
| `postgres`     | Boolean   |          | Flag whether a postgres database and credentials should be made                                                                  | `true`  |
| `subPath`      | String    |          | Subpath to use for this data plane if different from key and if participant routing is `"path"`                                  |         |
| `dnsPrefix`    | String    |          | DNS prefix to use for this data plane if different from key and if participant routing is `"subdomain"`                          |         |
| `config`       | Object    |          | Specific data plane config for TSG-based data planes. See also [Providing Custom Configuration](#providing-custom-configuration) |         |
| `overrides`    | Object    |          | Configuration overrides for the Helm chart values. See also [Providing Custom Configuration](#providing-custom-configuration)    |         |

## PostgreSQL Deployment Options

The CLI uses CloudNativePG for PostgreSQL management with declarative database creation, providing high availability, automated backups, and advanced management features.

### Database Management

Databases are created declaratively using CloudNativePG's Database CRD:
- Each application (SSO Bridge, Wallet, Control Plane, Data Planes) gets its own database
- Databases are created as separate Kubernetes resources after the cluster is deployed
- In per-namespace mode, databases are prefixed with participant ID to avoid collisions
- Database lifecycle can be managed independently from the cluster

### Deployment Modes

**Per-Namespace Mode** (_default_):
- Single shared PostgreSQL cluster for the entire namespace
- All participants share the same cluster with separate databases
- More resource efficient for many participants
- Simplified cluster management with high availability (1 instance by default)
- Configure instances and storage globally in `general` section

```yaml
general:
  postgresDeploymentMode: per-namespace
  postgresInstances: 1        # Number of instances for high availability
  postgresStorageSize: "1Gi"  # Storage size for the shared cluster
```
**Per-Participant Mode**:
- Each participant gets its own PostgreSQL cluster
- Isolated database resources per application per participant
- Better security isolation
- Easier to manage individual participant resources
- Configure instances and storage per participant using `overrides.postgres`

```yaml
general:
  postgresDeploymentMode: per-participant
participants:
  - id: alfa
    name: Alfa
    # ... other participant config
    overrides:
      postgres:
        instances: 2        # Number of PostgreSQL instances for this participant
        storageSize: "5Gi"  # Storage size for this participant's cluster
```


### PostgreSQL Configuration Options

**Shared Cluster Configuration (per-namespace mode)**:
- `general.postgresInstances`: Number of PostgreSQL instances (default: 1)
- `general.postgresStorageSize`: Storage size per instance (default: "1Gi")

**Per-Participant Cluster Configuration (per-participant mode)**:
- `participant.overrides.postgres.instances`: Number of instances for this participant's cluster (default: 1)
- `participant.overrides.postgres.storageSize`: Storage size for this participant's cluster (default: "1Gi")

**Example with mixed configurations**:
```yaml
general:
  namespace: tsg-ecosystem
  postgresDeploymentMode: per-participant
  # ... other general config

participants:
  - id: alfa
    name: Alfa
    # Uses default: 1 instance, 1Gi storage
  
  - id: bravo
    name: Bravo
    overrides:
      postgres:
        instances: 1
        storageSize: "10Gi"  # Larger storage for this participant
  
  - id: charlie
    name: Charlie
    overrides:
      postgres:
        instances: 3        # High availability setup
        storageSize: "5Gi"
```

### CloudNativePG Operator

The CloudNativePG operator must be installed in your cluster. The CLI will automatically check for it and offer to install it if not found:

```bash
# The CLI will prompt to install if not found, or install manually:
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm upgrade --install cnpg cnpg/cloudnative-pg --namespace cnpg-system --create-namespace
```

## Providing Custom Configuration

To provide custom configuration for TSG components, you can use the `config` and `overrides` fields in the participant configuration.

- The `config` field allows you to specify settings for the control plane, SSO bridge, and wallet components.
- The `overrides` field lets you customize any value in Helm chart values.

Both fields can be used together to achieve the desired configuration for your participant.

The CLI will use a deep merge of the properties, allowing to override any default values.

For example, when deploying a participant with a custom control plane configuration, you can specify it as follows:

```yaml
...
participant:
  ...
  config:
    controlPlane:
      runtime:
        controlPlaneInteractions: manual
  overrides:
    controlPlane:
      ingress:
        class: custom-ingress-class
```

This will create a control plane that has the runtime setting set via the `config` property, and the ingress class set via the `overrides` property.


> **_Note_**: By default when using arrays in either `config` or `overrides`, the CLI will replace the entire array. To append to an existing array, add a `"merge-array"` as first item in the array. This will append the items to the existing array instead of replacing it.  
> For example, with the original config:
> ```yaml
> config:
>   some_array:
>     - item1
>     - item2
> ```
> And the following override config:
> ```yaml
> config:
>   some_array:
>     - "merge-array"
>     - item3
>     - item4
> ```
> Results in the final config:
> ```yaml
> config:
>   some_array:
>     - item1
>     - item2
>     - item3
>     - item4
> ```

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
