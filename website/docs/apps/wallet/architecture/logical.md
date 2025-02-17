# Logical view

```mermaid
C4Component
    Container_Boundary(backend, "Backend") {
        Component(auth, "Authentication", "Provides authentication of<br />end-users as well as<br />authentication of other Wallets")
        Component(keys, "Keys", "Key-pair management for signing<br />credentials and presentations")
        Component(issuance, "Issuance", "Credential Issuance process<br />for both holder as issuer")
        Component(did, "DID", "Decentralized Identifiers (DID)<br />document service and resolver")
        Component(cred, "Credentials", "Verifiable Credentials issuance,<br />importing, updating, deleting")
        Component(presentation, "Presentation", "Verifiable Presentation protocols")
        Rel(auth, oauth, "User login", "oAuth2.0")
        %% Rel(did, db, "DIDDocuments")
        %% Rel(cred, db, "Credentials")
        Rel(cred, keys, "")
        Rel(issuance, cred, "")
        Rel(issuance, presentation, "")
        Rel(issuance, keys, "")
        %% Rel(issuance, db, "CredentialIssuance,CIAccessTokens")
        Rel(keys, did, "")
        %% Rel(keys, db, "KeyMaterialDao")
        Rel(presentation, cred, "")
        Rel(presentation, keys, "")
        %% Rel(presentation, db, "SITokens")
    }
    System_Ext(oauth, "Identity Provider", "External oAuth serivce managing users")
    ContainerDb(db, "Relational Database", "Stores all state of Wallet", "KeyMaterial, Credentials, DIDDocuments,<br />CredentialIssuance, CIAccessTokens,<br />SITokens")
    %% Component(frontend, "Frontend", "Provides all management<br />functionality of the Wallet")
    Container_Boundary(frontend, "Frontend") {
        Component(dashoardview, "Dashboard View")
        Component(keysview, "Keys View")
        Component(presentationView, "Presentation View")
        Container_Boundary(credentialsViews, "Credential Views") {
            Component(credentialsOverview, "Overview")
            Component(credentialsIssue, "Issue View")
            Component(credentialsImport, "Import View")
            Component(credentialsGaiaX, "Gaia-X View")
            Component(credentialsIssuance, "Issuance view")
        }
    }
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

Backend components:

- **Authentication**: Provides Guards to secure controllers.
- **DID**: Provides the DID document of the Wallet instance, as well as resolvement of DID identifiers to documents.
- **Keys**: Provides public-private key pairs for signing credentials, presentations, issuance requests.
- **Credentials**: Provides Verifiable Credential management.
- **Issuance**: Provides VC issuance process between two wallet instances.
- **Presentation**: Provides Verifiable Presentation creating/verification, with several supported processes of exchanging VPs between systems.

Frontend views:

- **Dashboard**: Overview of the Wallet instance.
- **Keys**: Key management.
- **Presentation**: Manual Presentation invocation.
- **Credentials Overview**: Credential management.
- **Credentials Issue**: Manual issuance of credentials.
- **Credentials Import**: Manual import of credentials.
- **Credentials Gaia-X**: Gaia-X Digital Clearing House credential support.
- **Credentials OID4VCI**: Credential issuance between two wallet instances.
