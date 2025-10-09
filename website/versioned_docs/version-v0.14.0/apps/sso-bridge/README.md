---
sidebar_label: 'Overview'
---
# TSG SSO Bridge

The SSO Bridge is a complete OAuth2.0 and OpenID Connect server implementation with integrated Verifiable Presentation-based authentication. It serves as the centralized identity and access management solution for the entire TSG ecosystem, bridging traditional authentication methods with Self-Sovereign Identity (SSI) protocols.

## Overview

The SSO Bridge provides unified authentication and authorization services across all TSG applications, enabling both standard OAuth2.0/OIDC flows and innovative Verifiable Presentation-based authentication. It seamlessly integrates with the TSG Mobile Wallet to provide credential-based authentication while maintaining compatibility with traditional identity systems.

**Key Capabilities:**
- **Multi-Protocol Authentication**: Support for OAuth2.0, OpenID Connect, and Verifiable Presentation protocols
- **Centralized SSO**: Single sign-on across Control Planes, Data Planes, and user interfaces
- **SSI Integration**: Native integration with TSG Mobile Wallet and Verifiable Credentials
- **Kubernetes Native**: Deep integration with Kubernetes authentication and ingress controllers
- **Role-Based Access Control**: Fine-grained authorization with role management

## Documentation

### For Developers
- **[Module Architecture](./modules.md)** - Technical overview of SSO Bridge modules and their responsibilities
- **[Configuration](./configuration.md)** - Configuration options and environment setup
- **[Build Process](./build-process.md)** - Development workflow and build instructions
- **[Integration Guide](./usage.md)** - Using SSO Bridge in your applications

### For System Architects
- **[System Architecture](../../architecture/README.md)** - Overall TSG architecture and design principles
- **[Authentication Patterns](./modules.md#sso-bridge-architecture-patterns)** - Multi-protocol authentication design

### For Operators
- **[Deployment Guide](../../tools/cli/README.md)** - Using the TSG CLI for deployment and management
- **[Configuration Reference](./configuration.md)** - Complete configuration documentation