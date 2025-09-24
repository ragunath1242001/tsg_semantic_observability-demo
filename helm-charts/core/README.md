# tsg-core (Library Chart)

`tsg-core` is a Helm _library_ chart providing shared templates, helper functions and patterns consumed by all TNO Security Gateway application charts. It is **not installed directly**. Application charts declare a dependency and invoke the partials via `include`.

## Provided Templates

The following partials can be used inside consumer charts (already wired in existing charts via symlinks):

| Template                  | Kind           | Description                                                                   |
| ------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `tsg-core.deployment`     | Deployment     | Standard Node.js service Deployment with health probes, config & optional PVC |
| `tsg-core.service`        | Service        | ClusterIP service exposing app port                                           |
| `tsg-core.ingress`        | Ingress        | NGINX Ingress with TLS + path mappings                                        |
| `tsg-core.cm`             | ConfigMap      | Renders merged `config:` values into `config.yaml`                            |
| `tsg-core.serviceaccount` | ServiceAccount | Optional SA when `serviceAccount.create=true`                                 |
| `tsg-core.role`           | Role           | Optional RBAC role from `serviceAccount.rules`                                |
| `tsg-core.rolebinding`    | RoleBinding    | Binds Role to SA                                                              |
| Helpers (`_helpers.tpl`)  | n/a            | Naming, labels, memory helpers, secret recursion                              |

## Key Helper Functions

### Naming & Labels
* `tsg-core.name`, `tsg-core.fullname`, `tsg-core.chart`, `tsg-core.labels`, `tsg-core.selectorLabels`

### Service Account
* `tsg-core.serviceAccountName` resolves the SA name when created or defaults to `default`.

### Sub Path Handling
* `tsg-core.subPath` produces a path prefix (always prefixed by `/`) or empty string.
  * Injected as environment variable `SUBPATH`.
  * Used in ingress path templating & public URL construction.

### Secret / Config Recursion
* `tsg-core.recurseSecretConfig` flattens a structured object in `configFromSecrets` into environment variables.
* Keys are upper snake case and hierarchical levels joined with `TSG__`.
* Secret references have form:
  ```yaml
  configFromSecrets:
    db:
      password:
        name: my-db-secret
        key: password
    example:
      users:
        - id:
            name: oauth-secret
            key: clientId
  ```
  Produces (selected examples):
  * `TSG__DB__PASSWORD` (valueFrom secretKeyRef)
  * `TSG__EXAMPLE__USERS__0__ID` (for first list entry)

### Memory Helpers
* `tsg-core.memoryToMegabytes` converts K8s memory quantities to MB (rounded down) – fails fast on invalid input.
* `tsg-core.limitToOldSpace` renders a Node option flag (`--max-old-space-size=<MB*0.9>`).
  * Automatically added as `NODE_OPTIONS` environment variable when a memory limit is set.

## Persistent Volume Support
If `persistentVolume` is supplied, the chart will create a PersistentVolumeClaim (PVC) named `<release-fullname>-pvc` for the application and mounts it to the deployment on `persistentVolume.mountPath`. The `analytics-data-plane` chart demonstrates this usage.

## Ingress & TLS
* Requires `host` to be set; chart will `fail` if unset and `ingress.enabled=true`.
* TLS secret name: `<host>-tls-secret`.
* Paths are templated, making subPath hosting simple:
  ```yaml
  subPath: control-plane
  ingress:
    paths:
      - path: '{{ template "tsg-core.subPath" $ }}/'
        type: Prefix
  ```
  Renders to `/control-plane/`.

## Configuration Rendering
`config:` values become file `/app/config.yaml` inside the container via a ConfigMap volume; checksum of the rendered YAML is added to pod template annotations to force rollout on change.

## Environment Variable Injection
* Base variables added:
  * `SUBPATH`
  * `NODE_OPTIONS` (if memory limit set)
* Additional from `env` (verbatim)
* `configFromSecrets` flattened, with secrets or literals. Used to express `config` values.

## Health Probes
All three (liveness, readiness, startup) hit `/health` on container port (default 3000) with conservative startup backoff (2s period, 60 failures threshold giving up to 120s warmup).

## Usage in Consumer Charts
Consumer charts typically just include the partials in a file like `templates/app.yaml`:
```yaml
{{ include "tsg-core.serviceaccount" . }}
{{ include "tsg-core.role" . }}
{{ include "tsg-core.rolebinding" . }}
{{ include "tsg-core.cm" . }}
{{ include "tsg-core.deployment" . }}
{{ include "tsg-core.service" . }}
{{ include "tsg-core.ingress" . }}
```

## Versioning
This library chart version is kept in sync with the application charts; automated release tooling bumps both `version`, `appVersion`, and the core library chart dependency version.

## Extending
1. Add new partial in `core/templates/_yourfeature.tpl`.
2. Include it from consumer charts.
3. Maintain backwards compatibility: avoid changing existing templates in the core library for a specific goal, but rather create new templates.

## Testing Locally
```bash
helm template test ./helm-charts/control-plane --set host=example.com
```

## Security Notes
* RBAC is created only when explicitly enabled.
* Works with cert-manager for automatic certificate issuance.
* Secrets are referenced (never embedded) via `configFromSecrets` path.

---
For high-level chart usage see parent `helm-charts/README.md`.
