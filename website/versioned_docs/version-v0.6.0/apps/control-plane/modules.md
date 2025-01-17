# Control Plane
This document outlines the modules and their dependencies for the control-plane application.


## AppModule


### Imports
- ScheduleModule
- EventEmitterModule
- AuthModule
- ConfigModule
- TypeOrmModule
- DataPlaneModule
- DspClientModule
- CatalogModule
- NegotiationModule
- TransferModule
- RegistryModule

### Controllers
- ConfigController
- HealthController

### Providers
- _None_

### Exports
- AuthModule
- DataPlaneModule
- DspClientModule
- CatalogModule
- NegotiationModule
- TransferModule


## ConfigModule


### Imports
- _None_

### Controllers
- _None_

### Providers
- _None_

### Exports
- _None_


## RegistryModule


### Imports
- AuthModule
- DspClientModule
- CatalogModule
- TypeOrmModule
- ScheduleModule

### Controllers
- RegistryClientController
- RegistryController

### Providers
- RegistryClientService
- RegistryService

### Exports
- RegistryService


## PolicyModule


### Imports
- CatalogModule
- TypeOrmModule
- AuthModule
- TransferModule

### Controllers
- AgreementManagementController
- PolicyEvaluationController
- RuleRepositoryController

### Providers
- AgreementService
- AgreementMonitorService
- PolicyEvaluationService
- RuleRepositoryService

### Exports
- AgreementService
- AgreementMonitorService
- PolicyEvaluationService
- RuleRepositoryService


## TransferModule


### Imports
- AuthModule
- DspClientModule
- forwardRef(() => DataPlaneModule)
- TypeOrmModule
- forwardRef(() => PolicyModule)

### Controllers
- TransferController
- TransferManagementController

### Providers
- TransferService

### Exports
- TransferService


## NegotiationModule


### Imports
- AuthModule
- DspClientModule
- CatalogModule
- TransferModule
- TypeOrmModule
- PolicyModule

### Controllers
- NegotiationController
- NegotiationManagementController

### Providers
- NegotiationService
- NegotiationListener

### Exports
- NegotiationService


## DspClientModule


### Imports
- AuthModule

### Controllers
- _None_

### Providers
- DspClientService
- DspGateway

### Exports
- DspClientService
- DspGateway


## CatalogModule


### Imports
- AuthModule
- DspClientModule
- TypeOrmModule

### Controllers
- CatalogController
- CatalogManagementController

### Providers
- CatalogService

### Exports
- CatalogService


## DataPlaneModule


### Imports
- CatalogModule
- TypeOrmModule
- AuthModule
- NegotiationModule
- PolicyModule

### Controllers
- DataPlaneController
- DataplaneManagementController

### Providers
- DataPlaneService

### Exports
- DataPlaneService


## AuthModule


### Imports
- PassportModule
- TypeOrmModule

### Controllers
- AuthController

### Providers
- AuthService
- VerifiablePresentationGuard
- VerifiablePresentationStrategy
- TransferVerifiablePresentationGuard
- TransferVerifiablePresentationStrategy
- OAuthGuard
- RolesGuard
- AuthClientService
- SessionSerializer

### Exports
- AuthService
- VerifiablePresentationGuard
- TransferVerifiablePresentationGuard
- OAuthGuard
- RolesGuard
- AuthClientService
