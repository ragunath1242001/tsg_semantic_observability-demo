# Http Data-Plane
This document outlines the modules and their dependencies for the http-data-plane application.


## AppModule


### Imports
- DataPlaneTestModule
- LoggingModule
- AuthModule
- ConfigModule
- TypeOrmModule

### Controllers
- _None_

### Providers
- _None_

### Exports
- DataPlaneTestModule
- AuthModule


## ConfigModule


### Imports
- _None_

### Controllers
- _None_

### Providers
- _None_

### Exports
- _None_


## LoggingModule


### Imports
- TypeOrmModule
- AuthModule

### Controllers
- LoggingController

### Providers
- LoggingService

### Exports
- LoggingService


## DataPlaneTestModule


### Imports
- TypeOrmModule
- AuthModule
- LoggingModule

### Controllers
- DataPlaneController
- DataPlaneManagementController
- ProxyController

### Providers
- DataPlaneService

### Exports
- _None_


## AuthModule


### Imports
- PassportModule

### Controllers
- AuthController

### Providers
- AuthClientService
- SessionSerializer
- OAuthGuard
- RolesGuard

### Exports
- AuthClientService
