# tsg-http-data-plane

Deploys the HTTP Data Plane (API + UI) of the TNO Security Gateway.

All standard resources are produced by the single `templates/app.yaml` which includes the shared `tsg-core` partials.

## Purpose
Acts as the primary HTTP protocol data plane component, exposing data exchange endpoints and UI.

## Required Values
| Key | Description |
|-----|-------------|
| `host` | External DNS host for ingress + public URLs |

## Ingress paths
```yaml
ingress:
  paths:
    - path: '{{ template "tsg-core.subPath" $ }}/'
      type: Prefix
```

The HTTP data plane only requires the default ingress towards the application.


## Sub-path Hosting
Set `subPath: http` to serve under `https://<host>/http/`.

See `../core/README.md` for global behaviors.
