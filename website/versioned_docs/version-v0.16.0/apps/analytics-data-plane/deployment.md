# Deployment

The Analytics Data Plane can be deployed using the TSG CLI, which handles container orchestration and service management. This guide focuses on the deployment of the Analytics Data Plane, with information on the orchestration of analytics workloads using Docker or Kubernetes.

## Orchestration (Docker / Kubernetes)

This page describes how the Analytics Data Plane runs workloads as part of an analysis. It is aimed at operators deploying the data plane.

The API can orchestrate execution using either:

- **Docker**: starts containers on the same host as the data plane.
- **Kubernetes**: creates `Job` resources in a Kubernetes cluster.

Select the backend with `orchestration.type` in the Analytics Data Plane configuration. See [Configuration](./configuration.md) for the complete parameter reference.

### Orchestration: Docker

Use Docker orchestration when the data plane can access a Docker engine.

**Requirements**

- Data plane container/process can reach the Docker socket (commonly `/var/run/docker.sock`).
- If you start containers in a user-defined network, set `orchestration.network` to that network.

**Configuration**

```yaml
orchestration:
  type: docker
  # socketPath: /var/run/docker.sock
  # network: my-network
  # mountFiles: true
  # platform: linux/amd64
```

The following options are available:
- `socketPath` (string, optional): Path to the Docker socket. Defaults to `/var/run/docker.sock`.
- `network` (string, optional): Docker network name to start containers in.
- `mountFiles` (boolean, default: false): If true, uploaded files are mounted into started containers instead of being provided via HTTP.
- `platform` (string, optional): Platform to use when pulling and creating images (e.g., `linux/amd64`). Useful for local testing on architectures different from the target deployment.

**Operational notes**

- Mounting the Docker socket effectively grants container-management permissions to the data plane; treat this as privileged access.
- `mountFiles` controls whether files are mounted into started containers or provided via HTTP by the data plane.

### Orchestration: Kubernetes

Use Kubernetes orchestration when the data plane should start isolated workloads as Kubernetes Jobs.

**Requirements**

- The data plane runs with a ServiceAccount that has RBAC permissions to create/read resources required for Jobs (at minimum: `jobs`, and typically `pods` for status/logging).
- `orchestration.namespace` points to the namespace where Jobs should be created.

**Configuration**

```yaml
orchestration:
  type: kubernetes
  namespace: default
```

**Uploads / PVC sharing**

If Jobs need access to uploaded files, configure a PVC and set `files.pvcName` so the data plane and Jobs can share the same volume. This requires a compatible access mode.

- See the “Persistent Volume Claim link with Jobs” section in [Configuration](./configuration.md).

### Minimal deployment checklist

- Configure `server.publicAddress` so redirects and callbacks work correctly behind ingress.
- Configure `auth` (or disable it explicitly in controlled environments).
- Configure Postgres for production.
- Choose `orchestration.type` and ensure the runtime (Docker socket or Kubernetes RBAC) matches.
