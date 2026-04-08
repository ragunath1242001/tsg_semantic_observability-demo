# Standards and Protocols

This document outlines the technical standards and protocols implemented by the TNO Security Gateway, providing the foundation for interoperability in data spaces.

## Identity and Credential Standards

### Decentralized Identifiers (DIDs)

TSG implements the [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/) standard to provide cryptographically verifiable, decentralized digital identities. This approach eliminates the need for centralized identity authorities while enabling participants to maintain full control over their digital identities.

The TSG Wallet supports multiple DID methods to accommodate different deployment scenarios and technical requirements. The **did:web** method leverages existing web infrastructure by storing DID documents at well-known HTTPS locations, making it simple to deploy and integrate with existing PKI infrastructure. Organizations can publish their DID documents using their existing domain infrastructure, providing a familiar and trusted approach to identity verification.

The **did:tdw (Trust DID Web)** method extends did:web with enhanced security features including cryptographic history verification and key rotation support. This method maintains an audit trail of all DID document changes, enabling participants to verify the complete history of identity changes and detect any unauthorized modifications.

### Verifiable Credentials

TSG implements the [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/) to enable trustworthy exchange of digital credentials between data space participants. This standard provides the foundation for establishing trust relationships and enabling fine-grained access control based on verifiable attributes. Both JSON Web Token (JWT) and JSON-LD formats are supported for Verifiable Credentials, allowing flexibility in data representation while ensuring compatibility with existing systems. Selective disclosure capabilties are not supported in the current implementation, but are planned for future releases.

The implementation supports multiple credential exchange protocols to ensure interoperability with different data space ecosystems and identity systems. **OpenID for Verifiable Credential Issuance (OID4VCI)** provides a standardized flow for credential issuance that integrates smoothly with existing OAuth 2.0 infrastructure. This protocol includes support for authorization server integration, proof verification, batch issuance, and deferred issuance scenarios.

**OpenID for Verifiable Presentations (OID4VP)** enables standardized credential presentation flows with support for selective disclosure, allowing credential holders to share only the minimum necessary information for any given interaction. The implementation includes presentation request handling, response encryption, and robust verification capabilities.

**Eclipse Decentralized Claims Protocol (DCP)** provides credential exchange specifically designed for data space scenarios. This protocol supports both credential issuance and presentation exchange, with tight integration to the Eclipse Dataspace Protocol for seamless data space operations.

## Data Space Protocols

### Eclipse Dataspace Protocol (DSP)

The Control Plane implements the complete [Eclipse Dataspace Protocol 2025-1-RC1](https://eclipse-dataspace-protocol-base.github.io/DataspaceProtocol/2025-1-RC1/) specification, providing standardized communication patterns for data space interactions. This protocol enables interoperability between different data space implementations while supporting complex multi-party scenarios.

The implementation covers four core protocol areas that work together to enable complete data space functionality. The **Catalog Protocol** provides service and data discovery capabilities, allowing participants to find available resources and understand their access requirements. **Contract Negotiation Protocol** handles the complex process of policy negotiation and agreement establishment between participants.

**Transfer Process Protocol** coordinates data transfer operations between participants, managing the lifecycle from initial request through completion and verification. The **Registry Protocol** enables participant registration and discovery, providing the foundation for data space ecosystem management.

Authentication and authorization are integrated throughout the protocol implementation using JWT-based authentication between participants, Verifiable Credential integration for participant identity verification, and robust policy-based access control evaluation.

#### Authentication and Authorization
- SSI-based Verifiable Presentation authentication between participants
- Policy-based access control evaluation

## Data Exchange Protocols

Data plane protocols are currently in active development within the broader data space community. As the field evolves, we expect standardized protocols to emerge from community initiatives and industry collaboration, with potential contributions from the TSG ecosystem where appropriate.

## Authentication and Authorization Protocols

The TSG platform implements authentication and authorization protocols for internal participant operations.

### OAuth 2.0 / OpenID Connect for Internal Authentication

The SSO Bridge provides OAuth 2.0 and OpenID Connect implementation following [RFC 6749](https://tools.ietf.org/html/rfc6749) and [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) standards. This serves as the authentication hub for administrative users and software components within a single participant's domain, supporting standard flows like Authorization Code with PKCE, Client Credentials, and integration with existing enterprise identity systems.

## Cryptographic Standards

The TSG platform implements robust cryptographic standards to ensure data security, integrity, and authenticity across all system components and communications.

### Digital Signature Implementation

The platform supports multiple digital signature algorithms to accommodate different security requirements and interoperability needs. **EdDSA (Edwards-curve Digital Signature Algorithm)** provides high-performance signature generation and verification with strong security guarantees. **ES256 (ECDSA with P-256)** offers broad compatibility with existing systems while maintaining strong cryptographic security. **RS256 (RSA with SHA-256)** ensures compatibility with legacy systems and established PKI infrastructure.

Public key distribution is managed through **JWKS (JSON Web Key Set)** following [RFC 7517 - JSON Web Key](https://tools.ietf.org/html/rfc7517) and **DID Documents**, providing a standardized mechanism for participants to discover and verify each other's public keys.

### Enterprise Key Management

The platform includes extensive key management capabilities designed for enterprise deployment scenarios:

**Hardware Security Module (HSM) support** is planned for production deployments, providing hardware-based key protection and cryptographic operations for the highest security environments.

**Key rotation and revocation capabilities** ensure that cryptographic keys can be updated and invalidated as needed, supporting both planned key updates and emergency revocation scenarios.

## Data Formats and Schema Standards

The TSG platform implements standardized data formats and schema validation to ensure interoperability and data integrity across all system components.

### DCAT for Data Catalog Metadata

TSG implements [DCAT 3 (Data Catalog Vocabulary)](https://www.w3.org/TR/vocab-dcat-3/) as the standard metadata model for describing data catalogs, datasets, and distributions in data spaces. This vocabulary provides a uniform way to represent dataset metadata, enabling standardized discovery and exchange of data resources between participants.

The implementation extends DCAT with domain-specific application profiles such as [HealthDCAT-AP](https://healthdataeu.pages.code.europa.eu/healthdcat-ap/) for health data scenarios, providing additional properties for domain-specific metadata like patient age ranges, medical coding systems, and data quality measurements.

For a detailed description of the DCAT structure used in TSG, including the relationship between Catalogs, Datasets, Distributions, and DataServices, see the [DCAT Metadata Structure](./dcat-structure.md) documentation.

### Schema Validation with JSON Schema

API request and response validation is implemented using [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema), providing robust validation capabilities for all data exchanges. The runtime validation system provides detailed error messages that help developers quickly identify and resolve data format issues.

This validation approach ensures data integrity throughout the system while providing clear feedback when data doesn't conform to expected formats, improving both system reliability and developer experience.

### JSON-LD for Semantic Data

The platform implements [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) to provide semantic context for DCAT Datasets, ODRL Policies, Verifiable Credentials and DID documents. This enables rich, machine-readable data representations that can be automatically processed and validated by different systems.

The implementation includes custom context definitions for data space-specific vocabularies, allowing the platform to extend standard schemas with domain-specific terms and relationships while maintaining compatibility with broader semantic web technologies.

Although JSON-LD is used for semantic data representation, most of the uses are governed by JSON Schema validation to ensure strict adherence to expected data formats and structures. This combination provides both semantic richness and robust validation capabilities.

### API Documentation with OpenAPI

The platform uses the [OpenAPI Specification 3.0](https://swagger.io/specification/) for thorough API documentation and client generation. This approach provides auto-generated documentation that stays synchronized with the actual API implementation, reducing the risk of outdated documentation and improving developer productivity.

---

**Next**: Learn about [Design Decisions](./design-decisions.md) or return to [Architecture Overview](./README.md).
