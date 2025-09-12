---
sidebar_label: 'Overview'
---
# TSG Control Plane

The TSG Control Plane is the TNO implementation of the Dataspace Protocol. It serves as the core orchestration layer for dataspace interactions, handling catalog management, contract negotiation, and transfer process coordination. The Control Plane also includes a registry component for service discovery within the dataspace ecosystem.

## Overview

The Control Plane acts as the primary interface for dataspace operations, implementing standardized protocols while providing secure, policy-driven access to data resources. It coordinates with data planes for actual data transfer and integrates with the TSG Wallet for identity and credential management.

**Key Capabilities:**
- **Catalog Management**: Publishing and discovering data assets according to Dataspace Protocol specifications
- **Contract Negotiation**: Automated negotiation of data usage agreements between dataspace participants  
- **Transfer Orchestration**: Managing data transfer processes and coordinating with appropriate data planes
- **Service Discovery**: Registry functionality for finding and connecting with other dataspace participants
- **Policy Enforcement**: Evaluation and enforcement of access control and usage policies

## Documentation

### For Developers
- **[Module Architecture](./modules.md)** - Technical overview of Control Plane modules and their responsibilities
- **[Process Flows](./flows.md)** - Detailed Dataspace Protocol implementation and interaction flows
- **[Configuration](./configuration.md)** - Configuration options and environment setup
- **[Build Process](./build-process.md)** - Development workflow and build instructions
- **[API Reference](./openapi.yaml)** - OpenAPI specification for all endpoints

### For System Architects
- **[System Architecture](../../architecture/README.md)** - Overall TSG architecture and design principles
- **[Compliance](./compliance.md)** - Standards compliance and interoperability details

### For Operators
- **[Deployment Guide](../../tools/cli/README.md)** - Using the TSG CLI for deployment and management
- **[Configuration Reference](./configuration.md)** - Complete configuration documentation
