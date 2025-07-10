# API Modules

The TSG Wallet API is organized into six core modules that handle different aspects of identity and credential management.

## Core Identity Modules

### DID Module (`/src/did/`)
**Purpose**: Manages Decentralized Identifier lifecycle including creation, resolution, and updates.

**Key Components**:
- **DID Management**: Create, update, and resolve DID documents
- **Method Support**: did:web and did:tdw implementations  
- **History Tracking**: Cryptographic history for did:tdw

**APIs**: `/did/management/*` for DID operations, `/.well-known/did/*` for resolution

### Keys Module (`/src/keys/`)
**Purpose**: Complete cryptographic key management and operations.

**Key Components**:
- **Key Management**: Generation, storage, rotation with HSM support
- **Signature Services**: Digital signing and verification operations
- **Token Services**: JWT operations and token management

**APIs**: `/keys/management/*`, `/keys/signature/*` for cryptographic operations

### Credentials Module (`/src/credentials/`)
**Purpose**: Verifiable credential storage, verification, and lifecycle management.

**Key Components**:
- **Secure Storage**: Encrypted credential storage with metadata indexing
- **Verification Engine**: Full validation including revocation checking
- **Selective Disclosure**: Privacy-preserving credential sharing

**APIs**: `/credentials/management/*` for credential operations

## Protocol Implementation Modules

### Issuance Module (`/src/issuance/`)
**Purpose**: Implements credential issuance protocols for issuing credentials to other participants.

**Key Components**:
- **OpenID4VCI**: Standard OAuth 2.0-based credential issuance flows
- **Eclipse DCP**: Enterprise credential issuance for data space scenarios
- **Batch Operations**: Support for bulk credential issuance

**APIs**: `/issuance/management/*` for configuration, protocol-specific endpoints for issuance flows

### Presentation Module (`/src/presentation/`)
**Purpose**: Handles credential presentation and verification for authentication/authorization.

**Key Components**:
- **OpenID4VP**: Standard presentation flows with selective disclosure
- **Eclipse DCP**: Enterprise presentation exchange
- **Direct Presentations**: Simplified presentation mechanisms

**APIs**: `/presentation/management/*` for configuration, protocol-specific endpoints for presentation flows

### Contexts Module (`/src/contexts/`)
**Purpose**: Manages JSON-LD contexts for semantic interoperability and schema validation.

**Key Components**:
- **Context Management**: Storage and retrieval of JSON-LD contexts
- **Schema Validation**: Credential validation against semantic schemas
- **Namespace Resolution**: Resolution of semantic namespaces and vocabularies

**APIs**: `/contexts/management/*` for context operations

---

## Integration Architecture

**Module Dependencies**: DID ↔ Keys (cryptographic operations), Credentials → Keys (verification), Issuance → Credentials + Keys, Presentation → Credentials + Keys, Contexts → Credentials (validation)

**External Integration**: All modules integrate with SSO Bridge for authentication, PostgreSQL for storage, and external systems for DID resolution and credential verification.

**Security**: Role-based access control across all modules, detailed audit logging, and encryption for sensitive data storage.

> **Complete API Reference**: See [OpenAPI Specification](./openapi.yaml) for detailed endpoint documentation.
