# tsg-wallet

Deploys the Wallet component (API + UI) providing credential issuance and related endpoints.

Each Kubernetes resource (ConfigMap, Deployment, Service, Ingress and optional RBAC) is rendered from the single `templates/app.yaml` using the shared library partials.

## Features
* Postgres-backed persistence (`config.db.*`)
* DID / credential related well-known endpoints:
  * `/.well-known/did.json`
  * `/.well-known/did.jsonl`
  * `/.well-known/openid-credential-issuer`

## Required Values
| Key | Description |
|-----|-------------|
| `host` | External DNS host for ingress & public address |
| `config.db.*` | Database connection settings |

## Ingress paths
```yaml
ingress:
  paths:
    - path: '{{ template "tsg-core.subPath" $ }}/'
      type: Prefix
    - path: /.well-known/did.json
      type: ImplementationSpecific
    - path: /.well-known/did.jsonl
      type: ImplementationSpecific
    - path: /.well-known/openid-credential-issuer
      type: ImplementationSpecific
```

The wallet requires the default ingress towards the application.

The `/.well-known/did.json` and `/.well-known/did.jsonl` endpoints are set to the root hostname to comply with the well-known URI in [RFC 8615](https://tools.ietf.org/html/rfc8615). These endpoints serve the DID document for the wallet.

The `/.well-known/openid-credential-issuer` endpoint is set to the root hostname to comply with the well-known URI in [RFC 8615](https://tools.ietf.org/html/rfc8615). This endpoint serves the OpenID Credential Issuer configuration for the wallet, used for OpenID 4 Verifiable Credential Issuance flows.

## Sub-path Hosting
Set `subPath: wallet` for `https://<host>/wallet/`.

Refer to `../core/README.md` for shared values.
