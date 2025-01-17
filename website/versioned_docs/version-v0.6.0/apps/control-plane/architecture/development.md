# Development View

The development view provides an overview of the different modules inside the control plane.

## Root `src/`

- `app.ts`: The starting point of the Control Plane
- `app.module.ts`: The main NestJS module of the Control Plane
- `config.ts`: Configuration classes used across the Control Plane
- `config.controller.ts`: Configuration controller responsible for providing the configuration settings to the frontend.
- `config.module.ts`: Configuration module responsible for parsing the configuration via YAML or Environment variables
- `health.controller.ts`: Controller handling health requests for providing the health of the instance to container orchestration frameworks.

## Authentication `src/auth`

- `auth.client.service.ts`: Service providing an authentication client for requests to other services in the same security domain
- `auth.controller.ts`: Controller handling authentication related requests
- `auth.module.ts`: Authentication module
- `auth.service.ts`: Authentication service handling authentication for several wallet clients.
- `oauth.bearer.strategy.ts`: Passport strategy for handling Bearer token authentication
- `oauth.strategy.ts`: Passport strategy for handling session-based authentication
- `oauth.guard.ts`: Guards controlling required authentication
- `roles.guard.ts`: Guard limiting access to specific roles
- `session.serializer.ts`: Session serialization for browser-based interactions
- `verifiablePresentation.guard.ts`: Guard controlling required authentication based on Verifiable Presentations
- `verfiablePresentation.strategy.ts`: Passport strategy for handling Verifiable Presentation based authentication

### Wallet Clients `src/auth/wallets`

- `dev.wallet.ts`: Development wallet to enable local development without deploying an actual wallet.
- `miw.wallet.ts`: Managed Identity Wallet client.
- `tsg.iatp.wallet.ts`: TSG Identity and Authentication Protocol wallet client.
- `tsg.wallet.ts`: TSG Wallet client.
- `walletClient.ts`: Generic Wallet Client to abstract away similar methods for the wallet clients listed above.

## Data Plane `src/data-plane`

- `dataplane.controller.ts`: Controller providing public endpoints for data plane interactions
- `dataplane.module.ts`: Data Plane module
- `dataPlane.service.ts`: Data Plane service providing the business logic for data planes
- `dataPlaneManagement.controller.ts`: Controller providing management endpoints for managing data planes

## Data Space Protocol `src/dsp`

### Catalog `src/dsp/catalog`

- `catalog.controller.ts`: Controller providing public endpoints for the catalog part of the DSP
- `catalog.module.ts`: Catalog part of the DSP module
- `catalog.service.ts`: Catalog service providing the business logic for the catalog part of the DSP
- `catalogManagement.controller.ts`: Controller providing management endpoints for managing the catalog

### Client `src/dsp/client`

- `client.module.ts`: Client module for the DSP.
- `client.service.ts`: Client service providing the business logic for communicating with other control planes
- `dsp.gateway.ts`: Websocket gateway to communicate events for several operations resulting from calls according to the DSP

### Negotiation `src/dsp/negotiation`

- `negotiation.controller.ts`: Controller providing public endpoints for the negotiation part of the DSP
- `negotiation.module.ts`: Negotiation part of the DSP module
- `negotiation.service.consumer.ts`: Negotiation service providing the business logic for the negotiation part of the DSP as a consumer
- `negotiation.service.provider.ts`: Negotiation service providing the business logic for the negotiation part of the DSP as a provider
- `negotiationManagement.controller.ts`: Controller providing management endpoints for managing the negotiations

### Transfer `src/dsp/transfer`

- `transfer.controller.ts`: Controller providing public endpoints for the transfer part of the DSP
- `transfer.module.ts`: Transfer part of the DSP module
- `transfer.service.ts`: Transfer service providing the business logic for the transfer part of the DSP
- `transferManagement.controller.ts`: Controller providing management endpoints for managing the transfers

## Model `src/model`

- `catalog.dao.ts`: Data access object providing TypeORM interfaces to a database for the catalog
- `common.dao.ts`: Data access object providing TypeORM interfaces for common fields
- `dataPlane.dao.ts`: Data access object providing TypeORM interfaces for data planes
- `negotiation.dao.ts`: Data access object providing TypeORM interfaces for negotiation objects
- `transfer.dao.ts`: Data access object providing TypeORM interfaces for transfer objects

## Registry `src/registry`

- `did.resolver.service.ts`: Service to resolve did documents from a did.
- `registry.client.controller.ts`: Controller providing public endpoints for client-side calls.
- `registry.client.service.ts`: Service providing business logic to perform client-side calls towards other entities
- `registry.controller.ts`: Controller providing information about saved catalogs.
- `registry.module.ts`: Registry module
- `registry.service.ts`: Service providing business logic to fetch other catalogs.

## Utils `src/utils`

- `address.ts`: Function to normalize an address
- `deserialize.pipe.ts`: Function to deserialize DTOs.
- `logging.ts`: Logic to enable/enhance logging.

### Errors `src/utils/errors`

- `error.ts`: Logic to enhance error information towards clients.

### Example, please remove

- `credentials.module.ts`: Credentials module
- `credentials.service.ts`: Credentials service providing all changes/state of credentials
- `credentials.controller.ts`: Controller providing public endpoints supporting credentials
- `credentials.management.controller.ts`: Controller providing management endpoints for managing credentials
