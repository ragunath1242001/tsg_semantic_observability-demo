---
sidebar_label: 'Overview'
---
# TSG Wallet

The TSG Wallet API provides complete Self-Sovereign Identity (SSI) capabilities for data space participation. It manages digital identities, verifiable credentials, and cryptographic operations that form the foundation of trust in data space ecosystems.

## Overview

The Wallet API serves as the identity management backbone for TSG, implementing W3C standards for Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). It provides both programmatic APIs for component integration and management interfaces for administrative operations.

### Key Capabilities

**Identity Management**: Complete lifecycle management of decentralized identifiers using multiple DID methods (did:web, did:tdw) with support for key rotation and DID document updates.

**Credential Operations**: Full support for credential issuance, storage, verification, and presentation using multiple protocols including OpenID4VC and Eclipse DCP.

**Cryptographic Services**: Secure key generation, storage, and cryptographic operations with hardware security module (HSM) support for production environments.

**Protocol Integration**: Native support for multiple credential exchange protocols, enabling interoperability with various data space ecosystems and identity systems.

## Module Architecture

The Wallet API is organized into six focused modules that handle different aspects of identity and credential management. Each module provides both management APIs for administrative operations and protocol APIs for standards-based interactions.

**Core Identity Modules** handle the fundamental identity operations: the **DID Module** manages decentralized identifiers with support for did:web and did:tdw methods, the **Keys Module** provides full cryptographic operations including HSM integration, and the **Credentials Module** manages verifiable credential storage and verification with selective disclosure capabilities.

**Protocol Implementation Modules** provide standards-based credential exchange: the **Issuance Module** implements OpenID4VCI and Eclipse DCP for credential issuance, the **Presentation Module** handles OpenID4VP and DCP for credential presentation, and the **Contexts Module** manages JSON-LD contexts for semantic interoperability.

> **Detailed Module Information**: See [API Modules](./modules.md) for complete module documentation including APIs, components, and integration details.

## API Structure

### Management APIs
Administrative interfaces for wallet configuration and management:
- **DID Management**: Create, update, and manage DID documents
- **Key Management**: Generate, rotate, and manage cryptographic keys
- **Credential Management**: Administrative operations for stored credentials
- **Issuance Management**: Configure and manage credential issuance
- **Presentation Management**: Configure presentation policies and templates

### Protocol APIs  
Standard protocol endpoints for credential exchange:
- **OpenID4VCI Endpoints**: OAuth 2.0 credential issuance flows
- **OpenID4VP Endpoints**: Presentation request and response handling
- **DCP Endpoints**: Eclipse Decentralized Claims Protocol implementation
- **DID Resolution**: DID document resolution and verification

### Integration APIs
APIs for integration with other TSG components:
- **Authentication**: Service-to-service authentication with JWT tokens
- **Status**: Health checks and system status information
- **Configuration**: Runtime configuration and feature flags

## Security Features

### Cryptographic Security
All cryptographic operations follow industry best practices with support for multiple algorithms and key types. Hardware Security Module (HSM) integration provides enhanced security for production deployments, while secure key storage ensures protection of private keys at rest.

### Access Control
Role-based access control (RBAC) governs access to management APIs, while API authentication uses JWT tokens issued by the SSO Bridge. Fine-grained permissions control access to specific wallet operations and data.

### Privacy Protection
Selective disclosure mechanisms enable sharing of minimal necessary information, while zero-knowledge proof capabilities support advanced privacy-preserving scenarios. All credential operations respect privacy-by-design principles.

## Configuration and Deployment

### Configuration Management
The Wallet API uses environment-based configuration with thorough validation and auto-generated documentation. Configuration options cover cryptographic settings, protocol endpoints, database connections, and security policies.

### Database Schema
PostgreSQL provides reliable storage for keys, credentials, DIDs, and operational state. The schema is designed for performance and security, with encryption for sensitive data fields and optimized indexes for common queries.

### Integration Points
- **SSO Bridge**: Authentication and session management
- **Control Plane**: Identity verification for data space operations  
- **External Systems**: DID resolution, credential verification services

## Implemented Specifications
- [Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [Presentation Exchange 2.0.0](https://identity.foundation/presentation-exchange/spec/v2.0.0)
- [Eclipse Decentralized Claims Protocol (DCP)](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol)
- [OpenID for Verifiable Credential Issuance - draft 16](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [OpenID for Verifiable Presentations - draft 24](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [Self-Issued OpenID Provider v2 - draft 13](https://openid.net/specs/openid-connect-self-issued-v2-1_0.html)


---

## Quick Navigation

- **[API Modules](./modules.md)** - Complete module documentation and API reference
- **[Configuration](./configuration.md)** - Complete configuration reference
- **[OpenAPI Specification](./openapi.yaml)** - Machine-readable API specification
- **[Process Flows](./flows.md)** - Standards-based protocol flows and interactions

> **For Integration**: See the [OpenAPI Specification](./openapi.yaml) for complete API documentation and the [Configuration Guide](./configuration.md) for deployment setup.
