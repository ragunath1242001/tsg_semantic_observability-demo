# Development View

The development view provides an overview of the different modules inside the wallet.

## Root `src/`

- `app.ts`: The starting point of the Wallet
- `app.module.ts`: The main NestJS module of the Wallet
- `config.ts`: Configuration classes used across the Wallet
- `config.module.ts`: Configuration module responsible for parsing the configuration via YAML or Environment variables
- `health.controller.ts`: Controller handling health requests for providing the health of the instance to container orchestration frameworks.

## Authentication `src/auth`

- `auth.module.ts`: Authentication module
- `auth.client.service.ts`: Service providing an authentication client for requests to other services in the same security domain
- `auth.controller.ts`: Controller handling authentication related requests
- `oauth.bearer.strategy.ts`: Passport strategy for handling Bearer token authentication
- `oauth.strategy.ts`: Passport strategy for handling session-based authentication
- `oauth.guard.ts`: Guards controlling required authentication
- `roles.guard.ts`: Guard limiting access to specific roles
- `session.serializer.ts`: Session serialization for browser-based interactions

## Credentials `src/credentials`

- `credentials.module.ts`: Credentials module
- `credentials.service.ts`: Credentials service providing all changes/state of credentials
- `credentials.controller.ts`: Controller providing public endpoints supporting credentials
- `credentials.management.controller.ts`: Controller providing management endpoints for managing credentials
