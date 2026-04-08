# API Modules

The Control Plane API implements the Dataspace Protocol specifications through a modular NestJS architecture. This document provides a technical overview of each module and its responsibilities.

## Core Domain Modules

### CatalogModule
**Purpose**: Manages data catalogs, datasets, distributions, and data services according to Dataspace Protocol specifications.

**Key Components**:
- `CatalogController` - Implements DSP catalog request endpoints (`/catalog/request`)
- `CatalogManagementController` - Provides internal management endpoints for catalog administration
- `CatalogService` - Core business logic for catalog operations and data management

**Data Entities**: CatalogDao, DatasetDao, DataServiceDao, DistributionDao, ResourceDao, CatalogRecordDao

**Dependencies**: AuthModule, VCAuthModule, DspClientModule

### NegotiationModule
**Purpose**: Implements contract negotiation protocol according to Dataspace Protocol specifications for establishing data usage agreements.

**Key Components**:
- `NegotiationController` - Handles DSP negotiation protocol endpoints (`/negotiations/*`)
- `NegotiationManagementController` - Internal management endpoints for negotiation oversight
- `NegotiationService` - Contract negotiation business logic and state management
- `NegotiationListener` - Event-driven coordination for negotiation state transitions

**Data Entities**: NegotiationDetailDao, NegotiationProcessEventDao

**Dependencies**: AuthModule, VCAuthModule, DspClientModule, CatalogModule, TransferModule, PolicyModule

### TransferModule
**Purpose**: Manages data transfer processes and coordinates with data planes for actual data exchange.

**Key Components**:
- `TransferController` - Implements DSP transfer protocol endpoints (`/transfer/*`)
- `TransferManagementController` - Internal transfer process management
- `TransferService` - Transfer orchestration and data plane coordination
- `TransferListener` - Event handling for transfer state management

**Data Entities**: TransferDetailDao

**Dependencies**: AuthModule, VCAuthModule, DataPlaneModule, DspClientModule

### RegistryModule
**Purpose**: Provides registry/service catalog functionality for discovering dataspace participants and their capabilities.

**Key Components**:
- `RegistryController` - Public registry discovery endpoints
- `RegistryClientController` - Client-side registry interaction endpoints
- `RegistryService` - Registry management and participant discovery logic

**Dependencies**: Configurable external registry integrations

## Infrastructure Modules

### DataPlaneModule
**Purpose**: Manages data plane registrations and coordinates between control plane and data planes for data transfer execution.

**Key Components**:
- Registration management for available data planes
- Data plane selection and routing logic
- Health monitoring and capability discovery

**Integration**: Communicates with HTTP Data Plane and Analytics Data Plane instances

### DspClientModule
**Purpose**: Provides client functionality for making outbound Dataspace Protocol requests to other connectors in the dataspace.

**Key Components**:
- HTTP client implementations for DSP protocol endpoints
- Request/response transformation for protocol compliance
- Error handling and retry logic for connector-to-connector communication

### VCAuthModule
**Purpose**: Handles Verifiable Credential authentication and authorization using Self-Sovereign Identity principles.

**Key Components**:
- `VCAuthService` - Core VC validation and authentication logic
- `VerifiablePresentationGuard` - Request guard for VC-based endpoint protection
- `TransferVerifiablePresentationGuard` - Specialized guard for transfer operations
- Wallet integration adapters for different wallet implementations

**Dependencies**: Integration with TSG Wallet API for credential verification

### PolicyModule
**Purpose**: Implements policy evaluation engine for access control and usage policies during negotiations and transfers.

**Key Components**:
- Policy parsing and evaluation engine
- Integration with negotiation and transfer workflows
- Support for various policy languages and frameworks

## Support Modules

### AuthModule
**Purpose**: Base authentication and authorization framework providing common security patterns.

**Source**: Shared from `@tsg-dsp/common-api` library

### StatusController
**Purpose**: Provides health checks, version information, and operational monitoring endpoints.

**Endpoints**:
- `/status` - Application health and status
- `/versions` - Version information
- `/health` - Terminus health checks for dependencies

### ConfigController
**Purpose**: Exposes configuration management endpoints for administrative access to system settings.

## Module Architecture Patterns

The Control Plane follows several architectural patterns:

- **Domain-Driven Design**: Core modules (Catalog, Negotiation, Transfer) represent business domains
- **Clean Architecture**: Clear separation between controllers, services, and data access layers
- **Event-Driven Architecture**: Listeners coordinate between modules using NestJS EventEmitter
- **Dependency Injection**: NestJS container manages module dependencies and lifecycle
- **Repository Pattern**: TypeORM DAOs abstract data persistence concerns

Each module encapsulates its domain logic while exposing well-defined interfaces for inter-module communication and external integrations.
