# API Modules

The SSO Bridge API provides OAuth2.0 and OpenID Connect server functionality with integrated Verifiable Presentation-based authentication. It serves as the centralized authentication and authorization service for the entire TSG ecosystem. This document provides a technical overview of each module and its responsibilities.

## Core Authentication Modules

### OauthModule
**Purpose**: Implements OAuth2.0 and OpenID Connect server functionality for standard authentication and authorization flows.

**Key Components**:
- `OauthController` - OAuth2.0 authorization and token endpoints (`/oauth/authorize`, `/oauth/token`)
- `MetadataController` - OpenID Connect discovery and JWKS endpoints (`/.well-known/openid-configuration`)
- `IngressAuthController` - Ingress authentication for Kubernetes integration
- `OauthService` - Core OAuth2.0 flow implementation and token management
- `TokenService` - JWT token creation, validation, and lifecycle management
- `IngressAuthService` - Authentication service for ingress controllers

**Data Entities**: TokenDao, KeyDao

**Dependencies**: UsersModule, ClientsModule

**Responsibilities**:
- OAuth2.0 authorization code and client credentials flows
- OpenID Connect identity provider functionality
- JWT token issuance and validation
- Integration with Kubernetes ingress authentication

### PresentationModule
**Purpose**: Implements Verifiable Presentation (VP) based authentication using OpenID for Verifiable Presentations (OID4VP) protocols.

**Key Components**:
- `OID4VPVerifierController` - Verifiable Presentation verification endpoints
- `OID4VPVerifierManagementController` - Management endpoints for VP verification configuration
- `OID4VPVerifierService` - Core VP verification and authentication logic
- `PresentationService` - Presentation request and response coordination

**Data Entities**: AuthorizationRequestDao (OID4VP requests)

**Dependencies**: UsersModule, OauthModule, RolesModule

**Responsibilities**:
- Verifiable Presentation request generation
- VP verification and validation
- Integration with TSG Mobile Wallet for authentication
- Credential-based identity verification

## Identity Management Modules

### UsersModule
**Purpose**: Manages user accounts, profiles, and authentication credentials within the SSO Bridge system.

**Key Components**:
- User account creation and management
- Password-based authentication (traditional flows)
- User profile and metadata management
- Integration with VP-based authentication

**Data Entities**: OauthUser

**Integration**: Used by OAuth and Presentation modules for user identity management

### RolesModule
**Purpose**: Implements role-based access control (RBAC) for fine-grained authorization across TSG applications.

**Key Components**:
- Role definition and management
- Permission assignment and validation
- Authorization policy enforcement
- Integration with OAuth token claims

**Data Entities**: OauthRole

**Integration**: Provides authorization context for OAuth tokens and VP-based sessions

### ClientsModule
**Purpose**: Manages OAuth2.0 client applications and their configurations for secure integration with TSG services.

**Key Components**:
- OAuth2.0 client registration and management
- Client authentication and validation
- Scope and permission management per client
- Integration with Control Planes, Data Planes, and UIs

**Data Entities**: OauthClient

**Integration**: Essential for all OAuth2.0 flows and client authentication
