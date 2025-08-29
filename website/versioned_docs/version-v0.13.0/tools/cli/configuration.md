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
