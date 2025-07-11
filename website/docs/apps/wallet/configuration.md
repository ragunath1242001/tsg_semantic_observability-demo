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

## Issue Configurations

Issue configurations define the structure, validation rules, and visual presentation of credential types that the wallet can issue and manage. Each configuration combines semantic interoperability through JSON-LD contexts with schema validation and visual styling.

### JSON-LD Context and Schema Relationship

Issue configurations leverage both **JSON-LD contexts** and **JSON Schema** for comprehensive credential definition:

- **JSON-LD Context** (`document` or `documentUrl`): Defines semantic meaning of credential properties for interoperability across systems
- **JSON Schema** (`schema`): Defines structure, validation rules, and user interface information for credential properties

### Schema-Driven User Interface

The JSON Schema directly influences how credentials are presented to users:

- **Property Order**: Schema property order determines display order in user interfaces
- **Human-Readable Titles**: The `title` property provides user-friendly labels instead of technical property names
- **Example Values**: The `example` property shows users expected data format
- **Validation Rules**: Properties like `enum`, `pattern`, and `required` ensure data quality and guide user input when issuing credentials

### Visual Styling

Issue configurations support visual customization through:

- **Background Color** (`backgroundColor`): Hex color code for credential background
- **Background Image** (`backgroundImage`): URL or base64-encoded image for credential branding. PNG-based images are recommended for transparency support and support across applications.
- **Text Color** (`textColor`): Hex color code for credential text
- **Display Metadata** (`name`, `description`): Human-readable credential information


## Possible configuration parameters
| Key                                               | Required | Type                                                  | Description                                                | Default                   |
| ------------------------------------------------- | -------- | ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------- |
| **`DatabaseConfig`**                              |          |                                                       |                                                            |                           |
| `db`                                              | Yes      | `DatabaseConfig`                                      | Database configuration                                     |                           |
| `db.type`                                         | Yes      | `"sqlite" \| "postgres"`                              | Type of database                                           |                           |
| `db.database`                                     | Yes      | `String`                                              | Name of the database                                       |                           |
| `db.synchronize`                                  |          | `Boolean`                                             | Synchronize database schema                                |                           |
| `db{type=sqlite}`                                 | Yes      | `SQLiteConfig`                                        | Database configuration                                     |                           |
| `db{type=sqlite}.type`                            |          | `"sqlite" \| "postgres"`                              | Type of database                                           | `"sqlite"`                |
| `db{type=sqlite}.database`                        | Yes      | `String`                                              | Name of the database                                       |                           |
| `db{type=sqlite}.synchronize`                     |          | `Boolean`                                             | Synchronize database schema                                |                           |
| `db{type=postgres}`                               | Yes      | `PostgresConfig`                                      | Database configuration                                     |                           |
| `db{type=postgres}.host`                          | Yes      | `String`                                              | Host of the database                                       |                           |
| `db{type=postgres}.port`                          | Yes      | `Number`                                              | Port of the database                                       |                           |
| `db{type=postgres}.username`                      | Yes      | `String`                                              | Username of the database                                   |                           |
| `db{type=postgres}.password`                      | Yes      | `String`                                              | Password of the database                                   |                           |
| `db{type=postgres}.ssl`                           |          | `Unknown`                                             | SSL configuration of the database                          |                           |
| `db{type=postgres}.type`                          |          | `"sqlite" \| "postgres"`                              | Type of database                                           | `"postgres"`              |
| `db{type=postgres}.database`                      | Yes      | `String`                                              | Name of the database                                       |                           |
| `db{type=postgres}.synchronize`                   |          | `Boolean`                                             | Synchronize database schema                                |                           |
| **`ServerConfig`**                                |          |                                                       |                                                            |                           |
| `server`                                          |          | `ServerConfig`                                        | Server configuration                                       |                           |
| `server.listen`                                   |          | `String`                                              | IP address the server listens on                           | `"0.0.0.0"`               |
| `server.port`                                     |          | `Number`                                              | Port the server listens on                                 | `3000`                    |
| `server.publicDomain`                             |          | `String`                                              | Public domain of the server                                | `"localhost"`             |
| `server.publicAddress`                            |          | `String`                                              | Public address of the server                               | `"http://localhost:3000"` |
| `server.subPath`                                  |          | `String`                                              | Sub path of the server                                     |                           |
| **`AuthConfig`**                                  |          |                                                       |                                                            |                           |
| `auth`                                            | Yes      | `AuthConfig`                                          | Management authentication configuration                    |                           |
| `auth.enabled`                                    |          | `Boolean`                                             | Enable authentication                                      | `true`                    |
| `auth.openIdConfigurationURL`                     |          | `String`                                              | OpenID configuration URL                                   |                           |
| `auth.callbackURL`                                |          | `URL`                                                 | Callback URL the auth service will redirect users          |                           |
| `auth.redirectURL`                                |          | `URL`                                                 | Redirect URL to UI after login/logout                      |                           |
| `auth.clientId`                                   |          | `String`                                              | Client ID                                                  |                           |
| `auth.clientSecret`                               |          | `String`                                              | Client secret                                              |                           |
| `auth.rolePath`                                   |          | `String`                                              | JSON path to extract roles from the token                  | `"$.roles[*]"`            |
| **`NodemailerConfiguration`**                     |          |                                                       |                                                            |                           |
| `email`                                           |          | `NodemailerConfiguration`                             | Email configuration                                        |                           |
| `email.enabled`                                   | Yes      | `Boolean`                                             | Enable email sending                                       |                           |
| `email.smtpFrom`                                  |          | `String`                                              | Email address to send emails from                          |                           |
| `email.smtpPort`                                  |          | `Number`                                              | SMTP port                                                  | `465`                     |
| `email.smtpSecure`                                |          | `Boolean`                                             | SMTP secure connection                                     | `true`                    |
| `email.smtpServer`                                |          | `String`                                              | SMTP server                                                |                           |
| `email.smtpUser`                                  |          | `String`                                              | SMTP user                                                  |                           |
| `email.smtpPassword`                              |          | `String`                                              | SMTP password                                              |                           |
| `email.title`                                     |          | `String`                                              | Title                                                      |                           |
| **`InitKeyConfig`**                               |          |                                                       |                                                            |                           |
| `initKeys`                                        |          | `InitKeyConfig[]`                                     | Initial key configurations                                 |                           |
| `initKeys[].type`                                 | Yes      | `"EdDSA" \| "ES384" \| "X509"`                        | Type of key                                                |                           |
| `initKeys[].id`                                   | Yes      | `String`                                              | ID of the key                                              |                           |
| `initKeys[].default`                              |          | `Boolean`                                             | Default key                                                |                           |
| `initKeys[].existingKey`                          |          | `Unknown`                                             | Existing PKCS#8 encoded key                                |                           |
| `initKeys[].existingCertificate`                  |          | `Unknown`                                             | Existing PEM encoded certificate                           |                           |
| **`InitCredentialConfig`**                        |          |                                                       |                                                            |                           |
| `initCredentials`                                 |          | `InitCredentialConfig[]`                              | Initial credential configurations                          |                           |
| `initCredentials[].context`                       |          | `String`                                              | JSON-LD contexts for the credential                        | `[]`                      |
| `initCredentials[].type`                          |          | `String`                                              | Types of the verifiable credential                         | `[]`                      |
| `initCredentials[].id`                            | Yes      | `String`                                              | ID of the credential                                       |                           |
| `initCredentials[].keyId`                         |          | `String`                                              | ID of key signing the credential                           |                           |
| `initCredentials[].revocable`                     |          | `Boolean`                                             | Revocable credential                                       | `true`                    |
| `initCredentials[].credentialSubject`             | Yes      | `Object`                                              | Credential subject                                         |                           |
| **`TrustAnchorConfig`**                           |          |                                                       |                                                            |                           |
| `trustAnchors`                                    |          | `TrustAnchorConfig[]`                                 | Trust anchor configurations                                |                           |
| `trustAnchors[].identifier`                       | Yes      | `String`                                              | DID of the trust anchor                                    |                           |
| `trustAnchors[].credentialTypes`                  |          | `String`                                              | Credential types trusted of the trust anchor               | `[]`                      |
| **`IssueConfigurationConfig`**                    |          |                                                       |                                                            |                           |
| `issueConfigurations`                             | Yes      | `IssueConfigurationConfig[]`                          | Issue configuration settings                               |                           |
| `issueConfigurations[].id`                        | Yes      | `String`                                              | ID of the configuration                                    |                           |
| `issueConfigurations[].credentialType`            | Yes      | `String`                                              | Credential type associated with the configuration          |                           |
| `issueConfigurations[].documentUrl`               |          | `URL`                                                 | URL of the JSON-LD context                                 |                           |
| `issueConfigurations[].document`                  |          | `Object`                                              | JSON-LD context body                                       |                           |
| `issueConfigurations[].schema`                    |          | `Object`                                              | JSON-Schema of the issue configuration                     |                           |
| `issueConfigurations[].name`                      |          | `String`                                              | Display name of the issue configuration                    |                           |
| `issueConfigurations[].description`               |          | `String`                                              | Description of the issue configuration                     |                           |
| `issueConfigurations[].backgroundColor`           |          | `String`                                              | Background color for the credential display                |                           |
| `issueConfigurations[].backgroundImage`           |          | `String`                                              | Background image for the credential display, must be a URL |                           |
| `issueConfigurations[].textColor`                 |          | `String`                                              | Text color for the credential display                      |                           |
| **`IssuanceConfig`**                              |          |                                                       |                                                            |                           |
| `issuance`                                        | Yes      | `IssuanceConfig`                                      | Issuance configuration                                     |                           |
| **`IssuerConfig`**                                |          |                                                       |                                                            |                           |
| `issuance.issuer`                                 | Yes      | `IssuerConfig[]`                                      | Issuer configuration                                       |                           |
| `issuance.issuer[].holderId`                      | Yes      | `String`                                              | DID of the holder                                          |                           |
| `issuance.issuer[].credentialType`                | Yes      | `String`                                              | Credential type to be issued                               |                           |
| `issuance.issuer[].credentialSubject`             | Yes      | `Object`                                              | Credential subject                                         |                           |
| `issuance.issuer[].preAuthorizedCode`             |          | `String`                                              | Pre-authorized code                                        |                           |
| **`DCPHolderConfig`**                             |          |                                                       |                                                            |                           |
| `issuance.dcp`                                    | Yes      | `DCPHolderConfig[]`                                   | DCP Holder configuration                                   |                           |
| `issuance.dcp[].preAuthorizedCode`                | Yes      | `String`                                              | Pre-authorized code                                        |                           |
| `issuance.dcp[].issuerId`                         | Yes      | `String`                                              | DID identifier of the issuer                               |                           |
| `issuance.dcp[].credentialType`                   | Yes      | `String`                                              | Credential type to be issued                               |                           |
| **`OID4VCIHolderConfig`**                         |          |                                                       |                                                            |                           |
| `issuance.oid4vci`                                | Yes      | `OID4VCIHolderConfig[]`                               | OID4VCI Holder configuration                               |                           |
| `issuance.oid4vci[].preAuthorizedCode`            | Yes      | `String`                                              | Pre-authorized code                                        |                           |
| `issuance.oid4vci[].issuerUrl`                    | Yes      | `URL`                                                 | Root URL of the issuer                                     |                           |
| `issuance.oid4vci[].credentialType`               | Yes      | `String`                                              | Credential type(s) to be issued                            |                           |
| **`DidServiceConfig`**                            |          |                                                       |                                                            |                           |
| `didServices`                                     | Yes      | `DidServiceConfig[]`                                  | DID service configurations                                 |                           |
| `didServices[].id`                                | Yes      | `String`                                              | ID of the service                                          |                           |
| `didServices[].type`                              | Yes      | `String`                                              | Type of the service                                        |                           |
| `didServices[].serviceEndpoint`                   | Yes      | `URL`                                                 | Service endpoint                                           |                           |
| **`PresentationConfig`**                          |          |                                                       |                                                            |                           |
| `presentation`                                    | Yes      | `PresentationConfig`                                  | Presentation configuration                                 |                           |
| `presentation.types`                              |          | `"DIRECT" \| "DCP" \| "OID4VP"`                       | Types of presentation protocols supported                  | `["DIRECT","DCP"]`        |
| **`RuntimeConfig`**                               |          |                                                       |                                                            |                           |
| `runtime`                                         | Yes      | `RuntimeConfig`                                       | Runtime configuration                                      |                           |
| `runtime.gaiaXSupport`                            |          | `Boolean`                                             | Enable Gaia-X support                                      |                           |
| `runtime.title`                                   |          | `String`                                              | Title of the wallet                                        |                           |
| `runtime.acceptUnauthenticatedCredentialRequests` |          | `Boolean`                                             | Accept unauthenticated credential requests                 |                           |
| `runtime.issueMobileCredentials`                  |          | `Boolean`                                             | Issue mobile credentials                                   |                           |
| `runtime.issueDebugCredentials`                   |          | `Boolean`                                             | Issue debug credentials                                    |                           |
| `runtime.color`                                   |          | `String`                                              | Primary color of the wallet                                | `"#3B8BF6"`               |
| `runtime.lightThemeUrl`                           |          | `String`                                              | Light theme logo URL                                       |                           |
| `runtime.darkThemeUrl`                            |          | `String`                                              | Dark theme logo URL                                        |                           |
| **`DidConfig`**                                   |          |                                                       |                                                            |                           |
| `did`                                             |          | `DidConfig`                                           | DID configuration                                          |                           |
| `did.method`                                      |          | `"did:web:" \| "did:tdw:"`                            | Provided DID method                                        | `"did:web:"`              |
| `did.keyFormat`                                   |          | `"JWK" \| "Multikey"`                                 | Provided key format                                        | `"JWK"`                   |
| **`SignatureConfig`**                             |          |                                                       |                                                            |                           |
| `signature`                                       |          | `SignatureConfig`                                     | Signature configuration                                    |                           |
| `signature.default`                               |          | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Default signature type                                     | `"DATA_INTEGRITY_PROOF"`  |
| `signature.credentials`                           |          | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Signature type for credentials                             | `"DATA_INTEGRITY_PROOF"`  |
| `signature.presentations`                         |          | `"DATA_INTEGRITY_PROOF" \| "JSON_WEB_SIGNATURE_2020"` | Signature type for presentations                           | `"DATA_INTEGRITY_PROOF"`  |
