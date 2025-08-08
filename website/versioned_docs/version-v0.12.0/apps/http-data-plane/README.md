---
sidebar_label: 'Overview'
---
# TSG HTTP Data Plane

The HTTP Data Plane is a lightweight implementation that enables efficient HTTP-based data exchange within the TSG ecosystem. It provides both consumer and provider capabilities, allowing applications to expose HTTP endpoints and access remote data sources through a secure, protocol-compliant interface.

## Overview

The HTTP Data Plane serves as the execution layer for data transfers, coordinating with the Control Plane for transfer orchestration while handling the actual data movement. It supports both direct HTTP endpoint exposure and proxy-based access patterns, making it suitable for a wide range of data sharing scenarios.

**Key Capabilities:**
- **HTTP Endpoint Management**: Expose and manage HTTP-based data services
- **Proxy Functionality**: Transparent access to remote data sources
- **Transfer Execution**: Reliable data transfer with state management and completion tracking
- **Lightweight Operation**: Minimal resource usage while maintaining full functionality
- **Security Integration**: Authentication and authorization for all data access operations

## Documentation

### For Developers
- **[Module Architecture](./modules.md)** - Technical overview of HTTP Data Plane modules and their responsibilities
- **[Configuration](./configuration.md)** - Configuration options and environment setup
- **[Build Process](./build-process.md)** - Development workflow and build instructions
- **[API Reference](./openapi.yaml)** - OpenAPI specification for all endpoints

### For System Architects
- **[System Architecture](../../architecture/README.md)** - Overall TSG architecture and design principles
- **[Process Flows](./flows.md)** - Detailed transfer flow documentation

### For Operators
- **[Deployment Guide](../../tools/cli/README.md)** - Using the TSG CLI for deployment and management
- **[Configuration Reference](./configuration.md)** - Complete configuration documentation
