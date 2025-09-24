# tsg-sso-bridge

Deploys the SSO Bridge component which mediates authentication / identity, exposing an OIDC compatible interface.

All rendered objects (SA/RBAC, ConfigMap, Deployment, Service, Ingress) are aggregated in `templates/app.yaml` via `tsg-core` includes.

## Features
* Postgres-backed persistence (`config.db.*`)
* Exposes discovery endpoint `/.well-known/openid-configuration`
* ServiceAccount + RBAC enabled by default (manages Kubernetes secrets)

## Required Values
| Key | Description |
|-----|-------------|
| `host` | External DNS host for ingress & public address |
| `config.db.*` | Database connectivity configuration |

## Ingress paths
```yaml
ingress:
  paths:
    - path: '{{ template "tsg-core.subPath" $ }}/'
      type: Prefix
    - path: /.well-known/openid-configuration
      type: ImplementationSpecific
```

The SSO Bridge requires the default ingress towards the application.

The `/.well-known/openid-configuration` endpoint is set to the root hostname to comply with the well-known URI in [RFC 8615](https://tools.ietf.org/html/rfc8615). And serves the OpenID Connect configuration for the SSO Bridge.

See `../core/README.md` for common behaviors.
