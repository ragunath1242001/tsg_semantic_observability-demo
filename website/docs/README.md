# Introduction

Welcome to the TNO Security Gateway (TSG) documentation! 

In today's interconnected digital landscape, organizations increasingly need to collaborate and share data while maintaining strict security, privacy, and sovereignty over their information. The TNO Security Gateway addresses this challenge by providing a robust, standards-based platform that enables secure participation in data spaces.

TSG is founded on the European Commission's [European strategy for data](https://digital-strategy.ec.europa.eu/en/policies/strategy-data) and the [Common European Data Spaces](https://digital-strategy.ec.europa.eu/en/policies/data-spaces) initiative. These strategic frameworks drive the development of secure, interoperable data sharing infrastructure across Europe.

TSG addresses these European strategies by providing the technical infrastructure needed to realize the vision of trusted data spaces. It enables organizations to participate in sector-specific data ecosystems while maintaining sovereignty over their data assets, implement security and interoperability standards for cross-border collaboration, and support the decentralized architecture that underpins European data sovereignty.

Whether you're a developer building data-driven applications, a system operator deploying enterprise infrastructure, or an organization looking to join a data ecosystem, this documentation will guide you through every aspect of working with TSG. From initial setup to advanced deployment scenarios, you'll find detailed information about components, architecture, security considerations, and best practices.

TSG empowers your organization to unlock the value of collaborative data exchange without compromising on security or control.

## Documentation Structure

This documentation is organized to support your journey with TSG, from initial exploration to production deployment. Start with [Getting Started](./getting-started.md) for a hands-on introduction, then explore the [Architecture](./architecture/) section to understand system design and technical foundations. Developers will find detailed API references and integration patterns in [Applications](./apps/), while operators can reference [Deployment](./deployment/) for deployment scenarios. The [Tools](./tools/) section covers utilities that simplify management tasks, and [Troubleshooting](./troubleshooting.md) provides diagnostic guidance when issues arise.

## Quick Start

Ready to dive in? This section provides fast-track paths based on your role and immediate needs.

### Getting Started Guide
**New to TSG?** Follow our [getting-started guide](./getting-started.md) with step-by-step instructions for:
- Installing the TSG CLI tool
- Joining the TSG Playground dataspace as a participant
- Verifying your deployment

### For Developers
If you're developing with or extending TSG:
1. Start with [System Overview](./architecture/system-overview.md) to understand the overall architecture
2. Review [Components](./architecture/components.md) for detailed component information
3. Explore specific [app documentation for module-level](./apps/) details
4. Check [Standards & Protocols](./architecture/standards-protocols.md) for implementation specifications

### For Operators
If you're deploying or operating TSG:
1. Follow the [Getting Started Guide](./getting-started.md) for quick setup
2. Review [System Overview](./architecture/system-overview.md) for component understanding
3. Use the [CLI Tool](./tools/cli/) for configuration and deployment

## What is TSG?

The TNO Security Gateway (TSG) is a complete platform that enables organizations to participate securely in data spaces where multiple parties can discover, negotiate, and exchange data while maintaining full control over their assets.

Modern data collaboration faces significant challenges: organizations need to share valuable data assets while ensuring privacy, maintaining sovereignty, establishing trust between unknown parties, and complying with regulations. Traditional point-to-point integrations become difficult to manage at scale, and centralized platforms often compromise data sovereignty.

### TSG's Solution

TSG addresses these challenges by providing a decentralized, standards-based infrastructure that enables:

- **Sovereign Data Exchange**: Organizations retain full control over their data while participating in collaborative ecosystems
- **Trust Without Centralization**: Cryptographic proof and verifiable credentials establish trust without requiring a central authority
- **Interoperable Standards**: Industry-standard protocols ensure compatibility across different data space implementations
- **Simple Deployment**: Streamlined setup process with CLI tools and containerized components for quick installation and configuration

### Key Capabilities

TSG provides a full suite of capabilities designed to address the complex requirements of modern data space participation. These research-driven features demonstrate how organizations can maintain sovereignty over their data while participating in collaborative ecosystems.

- **Digital Identity Management**:  
  Create and verify digital identities using decentralized technologies that establish trust without central authorities.
- **Data Space Protocols**:  
  Find relevant services and establish data exchange agreements through standardized discovery and negotiation.

- **Secure Data Exchange**:  
  Transfer data with strong security guarantees using specialized data planes for different exchange patterns.

- **Policy-Based Access Control**:  
  Control data access through machine-readable policies that automate compliance with sharing requirements.

### Architecture Overview

![Component diagram](/img/component-diagram.drawio.svg)

TSG follows a modular architecture designed for scalability, security, and flexibility. Each component serves a specific purpose while working together to create a complete data space solution. The separation of concerns allows for independent scaling and deployment while maintaining tight integration where needed.

- **Wallet**: Manages digital identities, credentials, and cryptographic operations
- **Control Plane**: Orchestrates data space interactions and protocol implementation
- **Data Planes**: Handle secure data exchange (HTTP for general use, Analytics for distributed computation)
- **SSO Bridge**: Provides administrative authentication and authorization services

> **Detailed Architecture**: For detailed architecture information, see the [Architecture](./architecture/) section.

## Standards and Protocols
TSG implements standard protocols for data space interoperability:

- **Identity**: [W3C Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-1.0/), [Verifiable Credentials (VCs)](https://www.w3.org/TR/vc-data-model-2.0/), [Eclipse Decentralized Claims Protocol (DCP)](https://eclipse-dataspace-dcp.github.io/decentralized-claims-protocol/), [OpenID 4 Verifiable Credentials](https://openid.net/sg/openid4vc/)
- **Data Space**: [Eclipse Dataspace Protocol (DSP)](https://eclipse-dataspace-protocol-base.github.io/DataspaceProtocol/)
- **Authentication**: [OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749), [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html)

> **Protocol Reference**: See [Standards & Protocols](./architecture/standards-protocols.md) for detailed specifications and implementation details.
