# API Modules

The HTTP Data Plane API provides a lightweight, efficient implementation for exposing and consuming HTTP-based data services within the TSG ecosystem. This document provides a technical overview of each module and its responsibilities.

## Core Modules

### DataPlaneModule
**Purpose**: Core data plane functionality for managing data endpoints, registrations, and coordination with the Control Plane.

**Key Components**:
- `DataPlaneController` - Implements data plane protocol endpoints for Control Plane coordination
- `DataPlaneManagementController` - Internal management endpoints for data plane configuration and monitoring
- `DataPlaneService` - Core business logic for data plane operations, endpoint management, and state tracking

**Data Entities**: DataPlaneStateDao, DatasetItemDao

**Dependencies**: AuthModule, LoggingModule

**Responsibilities**:
- Register and manage data endpoints with the Control Plane
- Handle data plane discovery and capability reporting
- Maintain data plane state and endpoint metadata
- Coordinate transfer process initialization

### TransferModule
**Purpose**: Manages data transfer processes, including both consumer-side data retrieval and provider-side data serving.

**Key Components**:
- `TransferController` - Implements transfer protocol endpoints for Control Plane coordination
- `TransferManagementController` - Internal transfer management and monitoring endpoints
- `ProxyController` - HTTP proxy functionality for transparent data access
- `TransferService` - Transfer orchestration, execution, and lifecycle management

**Data Entities**: TransferDao

**Dependencies**: AuthModule, LoggingModule, DataPlaneModule

**Responsibilities**:
- Execute transfer processes initiated by the Control Plane
- Provide HTTP proxy functionality for seamless data access
- Handle both consumer and provider transfer scenarios
- Manage transfer state and completion reporting

## Infrastructure Modules

### LoggingModule
**Purpose**: Provides complete logging and audit trail functionality for data plane operations.

**Key Components**:
- Structured logging for all data plane interactions
- Audit trail management for compliance and monitoring
- Integration with external logging systems

**Integration**: Used by all other modules for operational visibility and compliance

### AuthModule
**Purpose**: Authentication and authorization framework for securing data plane endpoints.

**Source**: Shared from `@tsg-dsp/common-api` library

**Integration**: Protects all management and data access endpoints

## Support Components

### ConfigController
**Purpose**: Exposes configuration management endpoints for data plane settings and operational parameters.

**Integration**: Provides runtime configuration access for administrators

## HTTP Data Plane Architecture Patterns

The HTTP Data Plane follows several key architectural patterns:

### Lightweight Design
- **Minimal Dependencies**: Focused on essential functionality to maintain low resource usage
- **Simple Module Structure**: Clear separation between core data plane logic and transfer management
- **Efficient Operation**: Optimized for high-throughput data access scenarios

### Protocol Integration
- **Control Plane Coordination**: Seamless integration with Control Plane for transfer orchestration
- **Standard HTTP**: Native HTTP protocol support for maximum compatibility
- **Proxy Functionality**: Transparent data access through HTTP proxy capabilities

### Transfer Patterns
- **Consumer Mode**: Retrieves data from remote sources through proxy functionality
- **Provider Mode**: Serves local data to authorized consumers
- **Stateful Management**: Tracks transfer progress and completion for reliable operation

## Key Capabilities

### Data Access Patterns
- **Direct HTTP Access**: Native HTTP endpoint exposure for applications
- **Proxy-Based Access**: Transparent proxy for remote data sources
- **Streaming Support**: Efficient handling of large data transfers
- **Authentication Integration**: Secure access control for all data operations

### Management Features
- **Runtime Configuration**: Dynamic configuration updates without restart
- **Transfer Monitoring**: Real-time visibility into transfer operations
- **Health Checking**: Operational status reporting for system monitoring
- **Audit Logging**: Detailed logging for compliance and debugging

### Deployment Flexibility
- **Containerized**: Docker-based deployment for cloud environments
- **Scalable**: Horizontal scaling support for high-volume scenarios
- **Integration Ready**: Clean APIs for integration with existing systems
- **Configuration Driven**: Flexible setup through configuration files

The HTTP Data Plane provides a robust yet lightweight foundation for HTTP-based data exchange within the TSG ecosystem, balancing simplicity with the complete functionality required for enterprise data operations.
