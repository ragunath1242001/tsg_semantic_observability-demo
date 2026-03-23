---
sidebar_label: 'Overview'
sidebar_position: 1
---

# Shared Libraries

This section explains the reusable libraries that sit underneath multiple TSG applications. The goal is not to document every exported symbol. The goal is to help users and developers understand what these shared building blocks do, where they fit, and which parts they can configure or extend when building on top of TSG.

## Who This Section Is For

Use these pages when you are:

- extending an existing TSG application
- building a new API or UI on top of the shared libraries
- trying to understand platform-wide behavior such as authorization, audit logging, or transfer handling
- looking for the right reusable module before creating app-specific code

Use the application sections when you need app-owned configuration, business flows, deployment details, or resource definitions that are specific to one service.

## Library Map

The common documentation is organized around the shared libraries in `libs/`.

### `common-api`

Shared backend foundation for authentication, ABAC authorization, request context, delegation, audit logging, configurable storage and forwarding handlers, configuration helpers, and common NestJS utilities.

### `common-ui`

Shared frontend foundation for user state, route permission checks, audit-log views, layout building blocks, and reusable Vue components.

### `common-dtos`

Shared vocabulary used across backend and frontend code, including actions, resources, permission strings, audit entry types, and other platform DTOs.

### `common-data-plane-api`

Reusable data-plane controllers, client services, configuration objects, and integration patterns for transfer-oriented APIs.

### `common-signing-and-validation`

Reusable signing, verification, DID resolution, proof validation, and trust-evaluation building blocks for credential-based and protocol-driven flows.

### `common-dsp`

Shared Dataspace Protocol and SSI models, JSON-LD helpers, serialization utilities, and protocol version helpers used by the higher-level libraries.

:::note

The library folder also includes libraries with the vocabularies for specific applications, those are primarily intended for usage within the owning application. These are not documented here. 

:::


## How This Relates To Application Docs

The same shared library can be used by multiple applications in different ways.

For example:

- the permission model and delegation behavior are documented here
- SSO Bridge documents how users and clients receive permissions
- HTTP Data Plane and Analytics Data Plane document how they apply the shared transfer abstractions in their own domains
- Wallet and other credential-oriented applications document their own flows, while the reusable cryptographic primitives are documented here

If a behavior is implemented once in a shared library and reused across apps, it belongs here first.