# Wallet
This document outlines the modules and their dependencies for the wallet application.


## AppModule


### Imports
- ScheduleModule
- ConfigModule
- TypeOrmModule
- PresentationModule
- AuthModule
- ContextModule
- CredentialsModule
- DidModule
- KeysModule
- IssuanceModule

### Controllers
- HealthController
- ConfigController

### Providers
- _None_

### Exports
- AuthModule
- CredentialsModule
- DidModule
- IssuanceModule
- KeysModule


## ConfigModule


### Imports
- _None_

### Controllers
- _None_

### Providers
- _None_

### Exports
- _None_


## PresentationModule


### Imports
- AuthModule
- CredentialsModule
- KeysModule
- DidModule

### Controllers
- _None_

### Providers
- PresentationService

### Exports
- PresentationService


## KeysModule


### Imports
- AuthModule
- DidModule
- TypeOrmModule

### Controllers
- KeysController
- KeysManagementController
- SignatureManagementController

### Providers
- KeysService
- SignatureService

### Exports
- KeysService
- SignatureService


## IssuanceModule


### Imports
- AuthModule
- TypeOrmModule
- ContextModule
- CredentialsModule
- DidModule
- KeysModule
- PresentationModule

### Controllers
- HolderController
- IssuerController

### Providers
- IssuerService
- HolderService

### Exports
- IssuerService
- HolderService


## DidModule


### Imports
- AuthModule
- TypeOrmModule

### Controllers
- DIDManagementController

### Providers
- DidService
- DidResolverService

### Exports
- DidService
- DidResolverService


## CredentialsModule


### Imports
- AuthModule
- DidModule
- KeysModule
- ContextModule
- TypeOrmModule

### Controllers
- CredentialsController
- CredentialsManagementController
- GaiaXManagementController

### Providers
- CredentialsService
- GaiaXService

### Exports
- CredentialsService
- GaiaXService


## ContextModule


### Imports
- AuthModule
- TypeOrmModule

### Controllers
- ContextController
- ContextManagementController

### Providers
- ContextService

### Exports
- ContextService


## AuthModule


### Imports

### Controllers
- AuthController

### Providers
- AuthClientService
- SessionSerializer
- OAuthGuard
- RolesGuard

### Exports
- AuthClientService
