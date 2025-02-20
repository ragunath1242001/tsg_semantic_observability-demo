---
[comment]: # (This file is auto generated)
hide_table_of_contents: true
---
# Configuration

In this section, the configuration of the wallet is explained. Configuration is used based on a `config.yaml` file which should be placed in the `apps/backend` folder. This `config.yaml` file is loaded when booting the application. The values get type checked, and it gives a clear error message if there is a configuration field missing or provided incorrectly. Next to the `config.yaml` file, you can also set environment variables. These override the values that are listed in the `config.yaml` file.

## Databases

By default, the development database is sqlite. We use postgres databases for production type instances of the wallets.

## Authentication

Authentication for frontend services can be done via OAuth. This helps users who need to login to several components to authenticate themselves faster. The wallet is tested against the SSO Bridge, with an Helm chart provided alongside the Helm chart of the wallet, but other OAuth services should be usable (e.g. Keycloak, or hosted OAuth services).

## DID Method

Two DID methods are currently supported: `did:web` and `did:tdw`. A comparison between the two is given below. The decision of which configuration to select should be made based on the specific use case of the wallet.

|                          | did:web                                                                                                                                                   | did:tdw                                                                                                                                                                                                                                              | did:key                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TSG Configuration value: | `did:web:`                                                                                                                                                | `did:tdw:`                                                                                                                                                                                                                                           | `-` (_DID Key is only supported for DID resolution but not for creation_)                                     |
| Specification link:      | [W3C internal document](https://w3c-ccg.github.io/did-method-web/)                                                                                        | [BCGov specification draft](https://bcgov.github.io/trustdidweb/)                                                                                                                                                                                    | [W3C internal document](https://w3c-ccg.github.io/did-method-key/)                                            |
| Supported version:       | Unofficial draft                                                                                                                                          | Draft v1                                                                                                                                                                                                                                             | Unofficial draft v0.7                                                                                         |
| Underlying technology:   | Web-based DID method that serves the DID Document as a JSON under a certain endpoint (.well-known path) of a web domain that is accessible by the public. | Web-based DID method that utilizes a public JSON Lines file hosted under a web domain to store each change (create, update, delete) that occurs on a DID Document. The DID Document is then resolved by fetching and processing the JSON Lines file. | Multibase Multicodec public key, with generated DID document                                                  |
| Identifier format:       | `did:web:{{public web domain}}`<br />e.g. `did:web:example.com`                                                                                           | `did:tdw:{{public web domain}}:{{generated self-certifying identifier}}`<br />e.g. `did:tdw:example.com:b7ep277b2mvxdpcrbja3iergubfy`                                                                                                                | `did:key:{{ Public key }}`                                                                                    |
| Advantages:              | Straightforward implementation with no additional processing other than hosting DID Document on web server.                                               | Additional security and validation mechanisms contained in the JSON Lines file that increases trustworthiness of DID Document.                                                                                                                       | No server implementation required, so very suitable for mobile wallets                                        |
| Disadvantages:           | Easily compromisable without notice by resolving parties when malicious access is gained to the web server.                                               | DID Document is not directly available as extra processing to verify signatures and validate entry hashes retrieved from the JSON Lines file needs to be performed to resolve the DID Document.                                                      | DID document only contains the verification method, so additional properties like `service` are not supported |

## Possible configuration parameters
| Key                                     | Required | Type                                                  | Description                                       | Default                   |
| --------------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| **`DatabaseConfig`**                    |          |                                                       |                                                   |                           |
| `db`                                    |          | `DatabaseConfig`                                      | Database configuration                            |                           |
| `db.type`                               |          | `"sqlite" \| "postgres"`                              | Type of database                                  |                           |
| `db.database`                           |          | `String`                                              | Name of the database                              |                           |
| `db.synchronize`                        | Yes      | `Boolean`                                             | Synchronize database schema                       |                           |
| `db{type=sqlite}`                       |          | `SQLiteConfig`                                        | Database configuration                            |                           |
| `db{type=sqlite}.type`                  |          | `"sqlite" \| "postgres"`                              | Type of database                                  | `"sqlite"`                |
| `db{type=sqlite}.database`              |          | `String`                                              | Name of the database                              |                           |
| `db{type=sqlite}.synchronize`           | Yes      | `Boolean`                                             | Synchronize database schema                       |                           |
| `db{type=postgres}`                     |          | `PostgresConfig`                                      | Database configuration                            |                           |
| `db{type=postgres}.host`                |          | `String`                                              | Host of the database                              |                           |
| `db{type=postgres}.port`                |          | `Number`                                              | Port of the database                              |                           |
| `db{type=postgres}.username`            |          | `String`                                              | Username of the database                          |                           |
| `db{type=postgres}.password`            |          | `String`                                              | Password of the database                          |                           |
| `db{type=postgres}.ssl`                 | Yes      | `Unknown`                                             | SSL configuration of the database                 |                           |
| `db{type=postgres}.type`                |          | `"sqlite" \| "postgres"`                              | Type of database                                  | `"postgres"`              |
| `db{type=postgres}.database`            |          | `String`                                              | Name of the database                              |                           |
| `db{type=postgres}.synchronize`         | Yes      | `Boolean`                                             | Synchronize database schema                       |                           |
| **`ServerConfig`**                      |          |                                                       |                                                   |                           |
| `server`                                | Yes      | `ServerConfig`                                        | Server configuration                              |                           |
| `server.listen`                         | Yes      | `String`                                              | IP address the server listens on                  | `"0.0.0.0"`               |
| `server.port`                           | Yes      | `Number`                                              | Port the server listens on                        | `3000`                    |
| `server.publicDomain`                   | Yes      | `String`                                              | Public domain of the server                       | `"localhost"`             |
| `server.publicAddress`                  | Yes      | `String`                                              | Public address of the server                      | `"http://localhost:3000"` |
| `server.subPath`                        | Yes      | `String`                                              | Sub path of the server                            |                           |
| **`AuthConfig`**                        |          |                                                       |                                                   |                           |
| `auth`                                  |          | `AuthConfig`                                          | Management authentication configuration           |                           |
| `auth.enabled`                          |          | `Boolean`                                             | Enable authentication                             | `true`                    |
| `auth.openIdConfigurationURL`           | Yes      | `String`                                              | OpenID configuration URL                          |                           |
| `auth.callbackURL`                      | Yes      | `URL`                                                 | Callback URL the auth service will redirect users |                           |
| `auth.redirectURL`                      | Yes      | `URL`                                                 | Redirect URL to UI after login/logout             |                           |
| `auth.clientId`                         | Yes      | `String`                                              | Client ID                                         |                           |
| `auth.clientSecret`                     | Yes      | `String`                                              | Client secret                                     |                           |
| `auth.rolePath`                         | Yes      | `String`                                              | JSON path to extract roles from the token         | `"$.roles[*]"`            |
| **`InitKeyConfig`**                     |          |                                                       |                                                   |                           |
| `initKeys`                              | Yes      | `InitKeyConfig[]`                                     | Initial key configurations                        |                           |
| `initKeys[].type`                       |          | `"EdDSA" \| "ES384" \| "X509"`                        | Type of key                                       |                           |
| `initKeys[].id`                         |          | `String`                                              | ID of the key                                     |                           |
| `initKeys[].default`                    | Yes      | `Boolean`                                             | Default key                                       |                           |
| `initKeys[].existingKey`                | Yes      | `Unknown`                                             | Existing PKCS#8 encoded key                       |                           |
| `initKeys[].existingCertificate`        | Yes      | `Unknown`                                             | Existing PEM encoded certificate                  |                           |
| **`InitCredentialConfig`**              |          |                                                       |                                                   |                           |
| `initCredentials`                       | Yes      | `InitCredentialConfig[]`                              | Initial credential configurations                 |                           |
| `initCredentials[].context`             | Yes      | `String`                                              | JSON-LD contexts for the credential               | `[]`                      |
| `initCredentials[].type`                | Yes      | `String`                                              | Types of the verifiable credential                | `[]`                      |
| `initCredentials[].id`                  |          | `String`                                              | ID of the credential                              |                           |
| `initCredentials[].keyId`               | Yes      | `String`                                              | ID of key signing the credential                  |                           |
| `initCredentials[].revocable`           | Yes      | `Boolean`                                             | Revocable credential                              | `true`                    |
| `initCredentials[].credentialSubject`   |          | `Object`                                              | Credential subject                                |                           |
| **`TrustAnchorConfig`**                 |          |                                                       |                                                   |                           |
| `trustAnchors`                          | Yes      | `TrustAnchorConfig[]`                                 | Trust anchor configurations                       |                           |
| `trustAnchors[].identifier`             |          | `String`                                              | DID of the trust anchor                           |                           |
| `trustAnchors[].credentialTypes`        |          | `String`                                              | Credential types trusted of the trust anchor      | `[]`                      |
| **`JsonLdContextConfig`**               |          |                                                       |                                                   |                           |
| `contexts`                              |          | `JsonLdContextConfig[]`                               | JSON-LD context configurations                    |                           |
| `contexts[].id`                         |          | `String`                                              | ID of the context                                 |                           |
| `contexts[].credentialType`             |          | `String`                                              | Credential type associated with the context       |                           |
| `contexts[].issuable`                   |          | `Boolean`                                             | Can be issued by this wallet                      |                           |
| `contexts[].documentUrl`                | Yes      | `URL`                                                 | URL of the JSON-LD context                        |                           |
| `contexts[].document`                   | Yes      | `Object`                                              | JSON-LD context body                              |                           |
| `contexts[].schema`                     | Yes      | `Object`                                              | JSON-Schema of the JSON-LD context                |                           |
| **`OID4VCIConfig`**                     |          |                                                       |                                                   |                           |
| `oid4vci`                               |          | `OID4VCIConfig`                                       | OID4VCI configuration                             |                           |
| **`IssuerConfig`**                      |          |                                                       |                                                   |                           |
| `oid4vci.issuer`                        |          | `IssuerConfig[]`                                      | Issuer configuration                              |                           |
| `oid4vci.issuer[].holderId`             |          | `String`                                              | DID of the holder                                 |                           |
| `oid4vci.issuer[].credentialType`       |          | `String`                                              | Credential type to be issued                      |                           |
| `oid4vci.issuer[].credentialSubject`    |          | `Object`                                              | Credential subject                                |                           |
| `oid4vci.issuer[].preAuthorizationCode` | Yes      | `String`                                              | Pre-authorization code                            |                           |
| **`HolderConfig`**                      |          |                                                       |                                                   |                           |
| `oid4vci.holder`                        |          | `HolderConfig[]`                                      | Holder configuration                              |                           |
| `oid4vci.holder[].preAuthorizationCode` |          | `String`                                              | Pre-authorization code                            |                           |
| `oid4vci.holder[].issuerUrl`            |          | `URL`                                                 | Root URL of the issuer                            |                           |
| `oid4vci.holder[].credentialType`       |          | `String`                                              | Credential type to be issued                      |                           |
| **`DidServiceConfig`**                  |          |                                                       |                                                   |                           |
| `didServices`                           |          | `DidServiceConfig[]`                                  | DID service configurations                        |                           |
| `didServices[].id`                      |          | `String`                                              | ID of the service                                 |                           |
| `didServices[].type`                    |          | `String`                                              | Type of the service                               |                           |
| `didServices[].serviceEndpoint`         |          | `URL`                                                 | Service endpoint                                  |                           |
| **`PresentationConfig`**                |          |                                                       |                                                   |                           |
| `presentation`                          |          | `PresentationConfig`                                  | Presentation configuration                        |                           |
| `presentation.types`                    | Yes      | `"DIRECT" \| "DCP" \| "OID4VP"`                       | Types of presentation protocols supported         | `["DIRECT","DCP"]`        |
| **`RuntimeConfig`**                     |          |                                                       |                                                   |                           |
| `runtime`                               |          | `RuntimeConfig`                                       | Runtime configuration                             |                           |
| `runtime.gaiaXSupport`                  | Yes      | `Boolean`                                             | Enable Gaia-X support                             |                           |
| `runtime.title`                         | Yes      | `String`                                              | Title of the wallet                               |                           |
| `runtime.color`                         |          | `String`                                              | Primary color of the wallet                       | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`                 | Yes      | `String`                                              | Light theme logo URL                              |                           |
| `runtime.darkThemeUrl`                  | Yes      | `String`                                              | Dark theme logo URL                               |                           |
| **`DidConfig`**                         |          |                                                       |                                                   |                           |
| `did`                                   | Yes      | `DidConfig`                                           | DID configuration                                 |                           |
| `did.method`                            |          | `"did:web:" \| "did:tdw:"`                            | Provided DID method                               | `"did:web:"`              |
| `did.keyFormat`                         |          | `"JWK" \| "Multikey"`                                 | Provided key format                               | `"JWK"`                   |
| **`SignatureConfig`**                   |          |                                                       |                                                   |                           |
| `signature`                             | Yes      | `SignatureConfig`                                     | Signature configuration                           |                           |
| `signature.default`                     | Yes      | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Default signature type                            | `"DATA_INTEGRITY_PROOF"`  |
| `signature.credentials`                 | Yes      | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Signature type for credentials                    | `"DATA_INTEGRITY_PROOF"`  |
| `signature.presentations`               | Yes      | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Signature type for presentations                  | `"DATA_INTEGRITY_PROOF"`  |
