---
sidebar_label: 'Overview'
---
# TNO Security Gateway Architecture

This section provides a detailed overview of the TNO Security Gateway (TSG) architecture, design decisions, and technical foundations.

## Overview

The TNO Security Gateway allows users to participate in data spaces, bridging the gap towards technical interoperability. The TSG consists of several crucial components that enable secure data exchange and identity management in decentralized environments.

## Architecture Sections

- **[System Overview](./system-overview.md)** - High-level architecture and component interactions
- **[Components](./components.md)** - Detailed breakdown of TSG components and their responsibilities  
- **[Standards and Protocols](./standards-protocols.md)** - Technical specifications and protocol implementations
- **[DCAT Metadata Structure](./dcat-structure.md)** - DCAT vocabulary structure for catalogs, datasets, and distributions
- **[Design Decisions](./design-decisions.md)** - Key architectural choices and rationale

## Quick Navigation

### Core Components
- [Wallet](../apps/wallet/) - SSI wallet for credential management
- [Control Plane](../apps/control-plane/) - Data space protocol coordination
- [HTTP Data Plane](../apps/http-data-plane/) - HTTP-based data exchange
- [Analytics Data Plane](../apps/analytics-data-plane/) - Distributed analytics coordination
- [SSO Bridge](../apps/sso-bridge/) - Authentication and authorization service

### Deployment
- [Deployment Guide](../deployment/) - How to deploy TSG components
- [CLI Tool](../tools/cli/) - Command-line deployment and configuration tool

---

> **For Developers**: This architecture documentation focuses on understanding the system design and implementation details. For deployment and end-user documentation, see the [Deployment](../deployment/) section.
