---
sidebar_label: 'Overview'
sidebar_position: 1
---

# TSG Applications

The TNO Security Gateway (TSG) consists of several interconnected applications that work together to provide a complete dataspace solution. Each application serves a specific role in the ecosystem while maintaining loose coupling through well-defined APIs and protocols.

## Core Applications

### Control Plane

The core orchestration layer implementing the Dataspace Protocol for catalog management, contract negotiation, and transfer coordination.

**Key Features:**
- Catalog management and asset discovery
- Automated contract negotiation
- Transfer process orchestration
- Service registry and discovery
- Policy enforcement

[→ Detailed Control Plane Documentation](./control-plane/)

### Wallet

Self-Sovereign Identity (SSI) management system providing complete digital identity and verifiable credentials capabilities.

**Key Features:**
- Decentralized identifier (DID) lifecycle management
- Verifiable credential operations
- Cryptographic services with HSM support
- Multi-protocol credential exchange
- W3C standards compliance

[→ Detailed Wallet Documentation](./wallet/)

### HTTP Data Plane

Lightweight data exchange layer for HTTP-based data sharing with both consumer and provider capabilities.

**Key Features:**
- HTTP endpoint management
- Transparent proxy functionality
- Reliable transfer execution
- Minimal resource footprint
- Security integration

[→ Detailed HTTP Data Plane Documentation](./http-data-plane/)

### Analytics Data Plane

*Development Status: Active Development*

Specialized implementation for distributed analytics and privacy-preserving computation across multiple dataspace participants.

**Key Features:**
- Distributed analytics workflows
- Privacy-preserving computation
- Multi-party orchestration
- Secure result aggregation
- Event-driven coordination

[→ Detailed Analytics Data Plane Documentation](./analytics-data-plane/)

### SSO Bridge

Centralized authentication and authorization server with OAuth2.0, OpenID Connect, and Verifiable Presentation support.

**Key Features:**
- Multi-protocol authentication
- Centralized single sign-on
- SSI integration with mobile wallet
- Kubernetes-native deployment
- Role-based access control

[→ Detailed SSO Bridge Documentation](./sso-bridge/)

## Application Relationships

### Identity & Authentication Flow
All TSG applications integrate with the **SSO Bridge** for authentication and the **Wallet** for identity operations, creating a seamless SSI-enabled authentication experience.

### Data Space Operations
The **Control Plane** orchestrates data space interactions while delegating actual data transfer to either the **HTTP Data Plane** or **Analytics Data Plane** depending on the use case.

### Development & Deployment
Each application includes both API and UI components, allowing for complete standalone operation or integrated deployment scenarios.
