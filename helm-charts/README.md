# Helm Charts

Helm charts for deploying components of the **TNO Security Gateway (TSG)**.

## Charts Overview

| Chart | Type | Purpose |
|-------|------|---------|
| [`core`](./core) | `library` | Shared templates, helpers & partials (not installed directly) |
| [`control-plane`](./control-plane) | `application` | Control Plane API + UI deployment |
| [`http-data-plane`](./http-data-plane) | `application` | HTTP Data Plane API + UI deployment |
| [`analytics-data-plane`](./analytics-data-plane) | `application` | Analytics Data Plane (adds PVC for uploads) |
| [`sso-bridge`](./sso-bridge) | `application` | Single Sign-On Bridge (OIDC facade & key mgmt) |
| [`wallet`](./wallet) | `application` | Wallet / credential issuance & verification |

All application charts consume the shared templates from `tsg-core` via a local file dependency and symbolic links to the `/core/templates` directory.

### Template Layout

Each application chart renders all Kubernetes objects (ServiceAccount/RBAC, ConfigMap, Deployment, Service, Ingress) from a **single template file**: `templates/app.yaml`, which sequentially includes the `tsg-core` partials. This simplifies diffing and maintenance versus one file per resource. When adding custom resources you can either extend `app.yaml` or add additional template files as needed.

## Common Features (via `tsg-core`)

Provided by the library chart and usable across all application charts:

* Deployment + Service + Ingress generation
* ConfigMap rendering of hierarchical `config:` values (templated)
* Optional ServiceAccount (with Role & RoleBinding) when `serviceAccount.create=true`
* Automatic conversion of memory limits to a Node.js `--max-old-space-size` value
* Recursive mapping of structured `configFromSecrets` into environment variables (`TSG__SECTION__KEY`)
* Sub-path hosting support through `subPath` value and `SUBPATH` env var
* Optional PersistentVolumeClaim attachment when `persistentVolume` values are supplied

See the detailed reference in [`core/README.md`](./core/README.md).

## Quick Start (local checkout)

From this repository root (or any chart directory):

```bash
# Dependency build (pulls in local tsg-core library for app charts)
helm dep update helm-charts/control-plane

# Install / upgrade (example: control plane)
helm upgrade --install tsg-control \
	helm-charts/control-plane \
	--namespace tsg --create-namespace \
	--set host=example.com
```

Replace `host` with your domain. TLS is managed through cert-manager using the `ingress.clusterIssuer` value (defaults to `letsencrypt`).

## Value Conventions (shared)

| Key | Description | Example |
|-----|-------------|---------|
| `image.repository` | Container image path | `registry.gitlab.com/.../control-plane` |
| `image.tag` | Image tag (templated default ties to chart version) | `v0.12.0` |
| `replicaCount` | Deployment replicas | `2` |
| `host` | External DNS host used for ingress + public URLs | `gateway.example.com` |
| `subPath` | Optional base path (mounted at `/subpath`) | `control-plane` |
| `ingress.enabled` | Enable ingress resource | `true` |
| `ingress.paths` | List of path mappings (templated) | see per‑chart README |
| `resources` | Pod resource requests/limits | standard k8s block |
| `serviceAccount.*` | ServiceAccount + RBAC controls | create rules etc. |
| `env` | Extra environment variables array | `[ { name: FOO, value: BAR } ]` |
| `configFromSecrets` | Structured secret references -> env | see core README |
| `config` | Application-level configuration serialized to `/app/config.yaml` | structured map |
| `persistentVolume.*` | Optional single PVC attachment (analytics only by default) | name/mountPath/storage |

## Adding / Updating a Chart

1. Add a new directory under `helm-charts/<name>` with a `Chart.yaml` and `values.yaml`.
2. Depend on `tsg-core` in `dependencies` (library chart).
3. Symlink required templates from `../core/templates` or add custom ones.
4. Run `helm dep update` before packaging or templating.

## Templating & Linting

```bash
# Dry-run template rendering
helm template test helm-charts/http-data-plane --set host=example.com

# (Optional) Package a chart
helm package helm-charts/http-data-plane
```

## Chart Specific Docs

Each chart has its own `README.md` with component‑specific notes:

* [`core`](./core/README.md)
* [`control-plane`](./control-plane/README.md)
* [`http-data-plane`](./http-data-plane/README.md)
* [`analytics-data-plane`](./analytics-data-plane/README.md)
* [`sso-bridge`](./sso-bridge/README.md)
* [`wallet`](./wallet/README.md)

---

## OAuth Private Key Configuration

For applications using `private_key_jwt` authentication, you have two options to provide the private key:

### Option 1: File-based configuration (Recommended)

1. Create a Kubernetes secret with your private key:

```bash
kubectl create secret generic my-app-oauth-key \
  --from-file=private-key.jwk=./path/to/private-key.jwk
```

2. Configure the Helm chart to mount the secret:

```yaml
config:
  auth:
    privateKeyJwkFile: "/var/secrets/private-key.jwk"

secretMounts:
  - name: oauth-private-key
    secretName: my-app-oauth-key
    mountPath: "/var/secrets"
    items:
      - key: "private-key.jwk"
        path: "private-key.jwk"
```

### Option 2: Inline configuration (Development only)

```yaml
config:
  auth:
    privateKeyJwk:
      kty: "RSA"
      # ... rest of JWK
```

---

For deeper template details refer to the `core` chart documentation.
