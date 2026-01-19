---
toc_max_heading_level: 2
---
# Components

This document provides a detailed breakdown of each TSG component, their internal structure, and key responsibilities.

## Control Plane

### Purpose
The Control Plane orchestrates data space interactions, implements data space protocols, and coordinates between the Wallet and Data Planes. It serves as the intelligent coordination layer that translates high-level data space operations into specific actions across the TSG ecosystem.

### Architecture and Key Modules
The Control Plane's architecture centers around implementing the Eclipse Dataspace Protocol through its **DSP** module, which handles all aspects of data space communication including contract negotiation, transfer coordination, and participant interaction. This module ensures compliance with dataspace standards while providing the flexibility needed for complex multi-party scenarios.

**Registry services** enable participant and service discovery within the data space ecosystem. The registry maintains information about available participants, their capabilities, and offered services, providing the foundation for data space interactions.

**Policy management** is handled through a dedicated module that enforces access controls and usage policies, ensuring that all data exchanges comply with organizational and contractual requirements. And continuous monitoring of active policies and transfers is executed to ensure compliance and security. 

**Data Plane coordination** is managed through interfaces that abstract the differences between various data plane implementations. This allows the Control Plane to coordinate transfers regardless of whether they're handled by the HTTP Data Plane, Analytics Data Plane, or future implementations.

The **Verifiable Credential Authentication** module integrates with the Wallet to provide credential-based authentication and authorization, ensuring that all Control Plane operations are properly authenticated and authorized based on verifiable credentials.

### Responsibilities
The Control Plane implements the complete Eclipse Dataspace Protocol specification, handling contract negotiations from initial discovery through final agreement. It manages the state machines required for dataspace interactions while coordinating with other components to ensure smooth operation.

Policy enforcement occurs at multiple levels, from high-level organizational policies down to specific transfer-level controls. The Control Plane evaluates policies in real-time and makes access decisions based on current context and participant credentials.

Transfer coordination involves managing the lifecycle of data transfers, from initial request through completion and verification. This includes coordinating with Data Planes for actual transfer execution while maintaining oversight and control throughout the process.

### Technology Stack
Built with Typescript and NestJS for enterprise application patterns, the Control Plane uses PostgreSQL for persistent state management and implements HTTP/REST protocols for both internal coordination and external data space communication.

[→ Detailed Control Plane Documentation](../apps/control-plane/)

## Wallet

### Purpose
The Wallet component implements a Self-Sovereign Identity (SSI) wallet that manages digital identities, credentials, and cryptographic operations for data space participation. It serves as the foundational trust layer for all TSG operations, ensuring that participants can establish verifiable identities and maintain cryptographic integrity throughout their data space interactions.

### Architecture and Key Modules
The Wallet is organized around six core modules that handle different aspects of identity and credential management. The **Authentication** module manages both user authentication for UI access and service-to-service authentication for component interactions. It integrates with the SSO Bridge to provide seamless authentication experiences while maintaining security boundaries.

**Key management** is handled by a dedicated **Keys** module that provides robust cryptographic operations including key generation, secure storage, and cryptographic signing and verification. This module supports multiple key types and algorithms, with hardware security module (HSM) integration for production environments being planned.

The **DIDs** module manages Decentralized Identifier documents, including creation, resolution, and updates. It supports multiple DID methods (`did:web` and `did:tdw`) and provides the foundation for all identity-related operations within the data space.

**Credential lifecycle management** is split between two specialized modules: the **Credentials** module handles storage, retrieval, and verification of received credentials, while the **Issuance** module manages the complex protocols for issuing credentials to other participants. These modules work together to provide complete credential management capabilities.

The **Presentation** module creates and verifies Verifiable Presentations. And is, therefore, the main integration point for authentication and authorization scenarios, allowing participants to present their credentials in a secure and verifiable manner.

### Responsibilities
The Wallet maintains the participant's digital identity throughout their data space lifecycle, from initial setup through ongoing operations. It manages the complete credential ecosystem, including issuing credentials to authorized recipients, storing credentials received from trusted issuers, and creating presentations for various authentication and authorization scenarios.

Cryptographic operations are centralized within the Wallet to ensure consistent security practices and key management across all TSG components. This includes signing operations for DIDs and credentials, verification of signatures from other participants, and key rotation procedures for maintaining long-term security.

### Technology Stack
The implementation leverages Typescript with the NestJS framework for enterprise-grade application structure and dependency injection. PostgreSQL provides reliable persistent storage for keys, credentials, and state information, while specialized cryptographic libraries handle the operations required for digital signatures and verification.

The Wallet implements multiple standards including W3C DIDs, Verifiable Credentials, OpenID4VC and Eclipse DCP.

[→ Detailed Wallet Documentation](../apps/wallet/)

## HTTP Data Plane

### Purpose
The HTTP Data Plane provides secure HTTP-based data exchange capabilities for general-purpose data transfer scenarios. It implements standard web protocols while adding the security and coordination features necessary for data space operations.

### Architecture and Key Modules
The core **Transfer** module coordinates HTTP-based data transfers as directed by the Control Plane. It supports various transfer patterns including direct downloads, streaming transfers. With optional proxying capabilities to allow for easier integration.

**Security integration** ensures that all data access is properly authenticated and authorized based on transfer agreements negotiated by the Control Plane.

### Responsibilities
The HTTP Data Plane executes data transfers according to agreements established by the Control Plane, handling the technical aspects of secure data movement while maintaining audit trails and monitoring capabilities. It implements access controls at the data level, ensuring that only authorized transfers proceed and that all access is properly logged.

Data format support includes handling most HTTP features, from simple single-endpoint services or complex API structures. 

### Technology Stack
Node.js with NestJS provides the runtime environment, while HTTP/HTTPS protocols handle the actual data transfer operations. Security is implemented generated tokens during transfer initiation, TLS encryption, and integration with Control Plane authorization systems.

[→ Detailed HTTP Data Plane Documentation](../apps/http-data-plane/)

## Analytics Data Plane

### Purpose
The Analytics Data Plane orchestrates multi-party analytics workflows through an event-based architecture that enables secure coordination between multiple data space participants. Rather than performing computations directly, it serves as the intelligent event exchange layer that coordinates analytics jobs while maintaining privacy and security throughout distributed computation scenarios.

### Architecture and Key Modules
**Event orchestration** forms the core of the Analytics Data Plane, managing the flow of events between multiple parties in complex analytics scenarios. The module handles event routing, sequencing, and delivery guarantees to ensure that all participants receive the correct events at the appropriate times in the computation workflow.

**Multi-party coordination** manages the state and synchronization of analytics workflows involving multiple participants. This includes participant registration, workflow state management, and ensuring that all parties are properly coordinated throughout the analytics process without exposing sensitive computation details.

**Job integration** provides the interface layer for external analytics jobs that consume and produce events. These jobs handle the actual computations while the data plane manages event exchange, allowing for flexible integration of various analytics frameworks, machine learning libraries, and custom computation engines.

**Event security and privacy** ensures that events are properly authenticated, encrypted, and routed only to authorized participants. The module implements privacy-preserving event handling techniques to ensure that event metadata and routing information do not leak sensitive details about the underlying computations.

### Responsibilities
The Analytics Data Plane orchestrates complex multi-party analytics workflows by managing the event-driven communication between participants and their respective analytics jobs. It ensures that events are delivered securely, while maintaining the isolation and privacy requirements of each participant.

The component coordinates with external analytics jobs through well-defined event interfaces, allowing organizations to plug in their preferred analytics tools and frameworks while benefiting from the secure multi-party coordination capabilities of the data plane.

### Technology Stack
Node.js with NestJS provides the event orchestration platform, with specialized event messaging and routing capabilities designed for secure multi-party scenarios. Integration APIs enable connection with various external analytics jobs and frameworks, while event security mechanisms ensure privacy-preserving coordination throughout the analytics workflow.

[→ Detailed Analytics Data Plane Documentation](../apps/analytics-data-plane/)

## SSO Bridge

### Purpose
The SSO Bridge provides authentication and authorization services for TSG components and external integrations, with support for both traditional OAuth/OIDC flows and modern security enhancements like two-factor authentication and advanced client authentication methods.

### Architecture and Key Modules
The **OAuth implementation** provides a complete OAuth 2.0 and OpenID Connect server that handles various authentication flows. This includes support for web applications, mobile clients, and service-to-service authentication scenarios. The implementation follows security best practices and supports modern extensions like PKCE for enhanced security. For client authentication, it supports both `client_secret_post` and `private_key_jwt` methods (RFC 7523), with the latter providing enhanced security for production environments.

**User management** handles user profiles, preferences, and basic identity information. The module provides user administration capabilities while maintaining secure user account management within the TSG ecosystem.

**Two-Factor Authentication** provides enhanced account security through TOTP (Time-based One-Time Password) and WebAuthn support. Users can enable 2FA using authenticator apps (Google Authenticator, Microsoft Authenticator, etc.) or hardware security keys (YubiKey, etc.). The module includes recovery code generation for account recovery scenarios.

**Session management** provides secure, scalable session handling across the entire TSG ecosystem. This includes token lifecycle management, refresh token rotation, and session security features like concurrent session limits and automatic timeout handling.

**Mobile SSI wallet integration** enables authentication using mobile Self-Sovereign Identity wallets, including the TSG Mobile Wallet. This integration allows users to authenticate using their mobile wallet credentials, providing a seamless bridge between mobile identity management and web-based TSG components.

### Responsibilities
The SSO Bridge provides OAuth 2.0 and OpenID Connect authentication services for all TSG components, ensuring that users can access multiple systems with a single authentication. It manages the complete lifecycle of user sessions, from initial login through token refresh and eventual logout.

For inter-component communication, the SSO Bridge supports advanced client authentication methods including `private_key_jwt` (RFC 7523), which uses asymmetric cryptography to provide stronger security than traditional shared secrets. This is particularly important for production deployments where component-to-component authentication security is critical.

Two-factor authentication capabilities enhance account security for users accessing the SSO Bridge and connected applications. Users can enable TOTP-based 2FA using authenticator apps or WebAuthn-based authentication using hardware security keys or platform authenticators (TouchID, Windows Hello).

Mobile SSI wallet authentication enables users to authenticate using their mobile Self-Sovereign Identity wallets, providing a bridge between mobile identity management and the TSG ecosystem. This includes support for the TSG Mobile Wallet and compatible SSI wallet implementations.

Single sign-on capabilities extend across all TSG UI components, providing users with seamless access to different parts of the system while maintaining appropriate security boundaries and access controls.

### Technology Stack
Built on Node.js with NestJS, the SSO Bridge uses PostgreSQL for user and session storage while implementing standard OAuth 2.0, OpenID Connect, and JWT protocols. Mobile SSI wallet integration supports secure authentication flows with compatible mobile wallet implementations.

[→ Detailed SSO Bridge Documentation](../apps/sso-bridge/)

## Component Communication

### Inter-Component APIs
All TSG components communicate via REST APIs with OAuth-based authentication. Each component exposes a well-defined set of APIs that allow other components to interact with it securely. The SSO Bridge serves as the central authentication authority, with components authenticating using OAuth 2.0 client credentials flow.

For production deployments, components can use the `private_key_jwt` authentication method (RFC 7523) instead of shared secrets, providing enhanced security through asymmetric cryptography. This method ensures that private keys never leave the component, reducing the risk of credential compromise.

Management endpoints are of particular interest for inter-component APIs, where integration with the SSO Bridge plays an important role in ensuring proper authentication and authorization.

### Database Architecture
Each component maintains its own database for:
- **Wallet**: Keys, credentials, DIDs, issuance state
- **Control Plane**: Contracts, policies, transfer state, registry
- **Data Planes**: Transfer logs, configuration, temporary data
- **SSO Bridge**: Users, sessions, OAuth clients

### Configuration Management
- YAML-file based configuration with environment variable overrides
- Kubernetes ConfigMaps and Secrets integration
- Runtime configuration updates via management APIs
- Configuration validation and schema enforcement

---

**Next**: Learn about [Standards and Protocols](./standards-protocols.md) or [Design Decisions](./design-decisions.md).
