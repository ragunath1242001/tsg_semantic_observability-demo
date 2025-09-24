# tsg-analytics-data-plane

Deploys the Analytics Data Plane service of the TNO Security Gateway, extending the shared templates with a Persistent Volume for uploads.

Resources (ConfigMap, Deployment, Service, Ingress, optional PVC mount, RBAC) are all included via `templates/app.yaml` using the shared partials.

## Key Difference vs Other Data Planes
Adds `persistentVolume` block to mount a PVC (e.g. for storing uploaded or generated analytic artifacts).

## Required Values
| Key | Description |
|-----|-------------|
| `host` | External DNS host for ingress/TLS/public URLs |

## PVC Configuration
```yaml
persistentVolume:
  mountPath: /uploads
  storageSize: 1Gi
  storageClassName: <your-storage-class-name>
```

The chart creates a PVC named `<release-fullname>-pvc` with a size of 1Gi, and will be automatically mounted to `/uploads`. Update the storageSize to reflect the usage scenario of the data plane. Also, a storage class that supports mounting multiple pods is advised in order to allow updates of the data plane pod to proceed without downtime.

## Ingress paths
```yaml
ingress:
  paths:
    - path: '{{ template "tsg-core.subPath" $ }}/'
      type: Prefix
```

The analytics data plane only requires the default ingress towards the application.

## Sub-path Hosting
Set `subPath: analytics` for `https://<host>/analytics/`.

Refer to `../core/README.md` for shared value descriptions.
