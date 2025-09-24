# tsg-control-plane

Deploys the Control Plane (API + UI) of the TNO Security Gateway.

All core resources are rendered from a single consolidated template: `templates/app.yaml` (includes service account, RBAC, config map, deployment, service and ingress via `tsg-core` partials).

## Features
* Web + API combined service
* Postgres connection config via `config.db.*`
* Additional ingress paths for WebSocket (`/socket.io`) and version endpoint (`/.well-known/dspace-version`)

## Required Values
| Key | Description |
|-----|-------------|
| `host` | External DNS host used for ingress and public URLs |
| `config.db.*` | Database connectivity (host/service) |

## Ingress paths
```yaml
ingress:
  paths:
    - path: '{{ template "tsg-core.subPath" $ }}/'
      type: Prefix
    - path: /.well-known/dspace-version
      type: ImplementationSpecific
    - path: /socket.io
      type: ImplementationSpecific
```

The control plane requires the default ingress towards the application.

The `/.well-known/dspace-version` is set to the root hostname to comply with the well-known URI in [RFC 8615](https://tools.ietf.org/html/rfc8615). This endpoint serves the versions of the DSP the control plane serves.
The `/socket.io` path is used for WebSocket connections used in the user interface of the control plane.

## WebSocket Support
The explicit `/socket.io` ingress path ensures proper upgrade handling (ImplementationSpecific) with most NGINX ingress controllers.

## Sub-path Hosting
Set `subPath: control-plane` to expose the UI under `https://<host>/control-plane/`.

Refer to `../core/README.md` for shared value semantics.
