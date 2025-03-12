# TSG CLI Tool

For an example with steps to use the CLI tool see the [docs page](../../deployment/deployment.md).

## Commands

```
Usage: tsg [options] [command]

Options:
  -v, --version                output the current version
  -h, --help                   display help for command

Commands:
  bootstrap [options] <scope>  Bootstrap CLI utility to generate configuration files
  deploy [options] <scope>     Deploy configuration to an Kubernetes cluster (requires Helm to be installed)
  help [command]               display help for command
```

### Bootstrap

```
Usage: tsg bootstrap [options] <scope>

Bootstrap CLI utility to generate configuration files

Arguments:
  scope               scope of configuration generation (choices: "ecosystem", "participant")

Options:
  -f, --file <file>   input configuration file (default: "ecosystem.yaml" or "participant.yaml")
  -o, --output <dir>  output directory (default: "output")
  --stdout            output only to standard out (default: false)
  -v, --verbose       verbose logging (default: false)
  -y --yes            assume yes for all prompts (default: false)
  -h, --help          display help for command
```

### Deploy

```
Usage: tsg deploy [options] <scope>

Deploy configuration to an Kubernetes cluster (requires Helm to be installed)

Arguments:
  scope              scope of deployment (choices: "ecosystem", "participant")

Options:
  -f, --file <file>  input configuration file (default: "ecosystem.yaml" or "participant.yaml")
  --config <dir>     config file location (created by the "bootstrap" command) (default: "output")
  -u, --uninstall    only uninstall charts and secrets (default: false)
  -c, --clean        uninstall existing charts before installing (default: false)
  --clean-database   uninstall database while cleaning (default: false)
  -d, --diff         show diffs before deployment (default: false)
  --dry-run          dry run commands (default: false)
  --cwd <cwd>        working directory for the configuration files
  -v, --verbose      verbose logging (default: false)
  -y --yes           assume yes for all prompts (default: false)
  -h, --help         display help for command
```

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
| `namespace`       | String    | Yes      | Kubernetes namespace used for deployments                                                               |         |
| `username`        | String    | Yes      | Default admin username                                                                                  |         |
| `password`        | String    | Yes      | Default admin password                                                                                  |         |
| `authorityDomain` | String    | Yes      | Domain name of the authority, either the one deployed as participant or an external dataspace authority |         |
| `credentialType`  | String    | Yes      | Credential type name                                                                                    |         |

### Applications

| Name           | Data Type                                  | Required                | Explanation                                                        | Default |
| -------------- | ------------------------------------------ | ----------------------- | ------------------------------------------------------------------ | ------- |
| `postgres`     | [Application](#application)                |                         | Postgres [application](#application), defaults to Bitnami Postgres |         |
| `ssoBridge`    | [Application](#application)                |                         | SSO Bridge [application](#application)                             |         |
| `wallet`       | [Application](#application)                |                         | TSG Wallet                                                         |         |
| `controlPlane` | [Application](#application)                |                         | TSG Control Plane                                                  |         |
| `dataPlanes`   | [`Map<String, Application>`](#application) | Data plane applications |                                                                    |         |

### Application

| Name               | Data Type | Required | Explanation                         | Default                    |
| ------------------ | --------- | -------- | ----------------------------------- | -------------------------- |
| `chartVersion`     | String    |          | Helm chart version                  | CLI version                |
| `chartName`        | String    |          | Helm chart name                     |                            |
| `developmentChart` | Boolean   |          | Use TSG development Helm repository | `false`                    |
| `imageTag`         | String    |          | Docker image tag                    | CLI version                |
| `imageRepository`  | String    |          | Docker image repository             | TSG Gitlab Docker registry |

### Participant

| Name                   | Data Type                              | Required                  | Explanation                                                                                                                                                   | Default  |
| ---------------------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `host`                 | String                                 | Yes                       | Domain name, used for host ingress paths                                                                                                                      |          |
| `id`                   | String                                 | Yes                       | Participant identifier, used for identifier for instances                                                                                                     |          |
| `name`                 | String                                 | Yes                       | Participant name, used for metadata                                                                                                                           |          |
| `routing`              | `"path"` or `"subdomain"`              |                           | Path-based or subdomain-based routing for services                                                                                                            | `"path"` |
| `hasControlPlane`      | Boolean                                |                           | Flag whether a control plane should be deployed                                                                                                               | `false`  |
| `hasTestService`       | Boolean                                |                           | Flag whether a test HTTP data plane should be deployed with a test service                                                                                    | `false`  |
| `hasDebugLogging`      | Boolean                                |                           | Flag whether to enable debug logging for the services                                                                                                         | `false`  |
| `issuer`               | Boolean                                |                           | Flag whether this participant is an issuer of credentials. Should be used only for a dataspace authority                                                      | `false`  |
| `document`             | Object                                 | Yes if `issuer` is `true` | JSON-LD document for credentials that will be issued                                                                                                          |          |
| `schema`               | Object                                 | Yes if `issuer` is `true` | JSON schema for credentials that will be issued                                                                                                               |          |
| `preAuthorizationCode` | String                                 |                           | Pre-authorization code for requesting a credential via OID4VCI. Use only when also deploying a dataspace authority or when a code is received from the issuer |          |
| `dataPlanes`           | [`Map<String, DataPlane>`](#dataplane) |                           | Data planes that will be configured for this participant                                                                                                      |          |

### DataPlane

| Name           | Data Type | Required | Explanation                                                                                            | Default |
| -------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------ | ------- |
| `type`         | String    |          | Data plane type, only required when type does not match key                                            |         |
| `tsgDataPlane` | Boolean   |          | Flag whether data plane configuration following the TSG data planes should be generated                | `true`  |
| `postgres`     | Boolean   |          | Flag whether a postgres database and credentials should be made                                        | `true`  |
| `subPath`      | String    |          | Subpath to use for this data plane if different from key and if participant routing is `"path`         |         |
| `dnsPrefix`    | String    |          | DNS prefix to use for this data plane if different from key and if participant routing is `"subdomain` |         |
| `config`       | Object    |          | Specific data plane config                                                                             |         |
