---
sidebar_position: 2
---

# Authorization And ABAC

This page explains the shared Attribute-Based Access Control (ABAC) model used across TSG applications. It focuses on how permissions are interpreted and enforced after they have been issued. In most deployments the SSO Bridge is the place where users and clients receive permissions, but the actual authorization behavior is implemented in the shared libraries and reused across multiple APIs and UIs.

## Overview

TSG uses a permission-based ABAC model to decide whether a caller may perform an action on a resource. The same model is used by backend APIs, route-level frontend checks, delegated service-to-service calls, and audit logging.

The shared implementation is primarily provided by:

- `libs/common-api` for backend enforcement, request context, decorators, and delegation handling
- `libs/common-dtos` for the shared `Action`, `Resource`, and permission-string types
- `libs/common-ui` for route-level permission helpers that mirror the backend rules

Each permission combines:

- an action such as `read` or `execute`
- a resource such as `cp.catalog` or `dp.transfer`
- an optional scope such as `own` or a specific resource ID

## Permission Structure

Permissions use the following format:

```text
action:resource[:scope]
```

| Component | Description | Examples |
| --- | --- | --- |
| Action | The operation being performed | `read`, `create`, `update`, `delete`, `execute`, `manage` |
| Resource | The namespaced target resource | `cp.catalog`, `sso.user`, `w.credential`, `dp.transfer` |
| Scope | Optional restriction for ownership or resource IDs | `*`, `own`, `dataset-123` |

Examples:

| Permission | Meaning |
| --- | --- |
| `read:cp.catalog` | Read all catalogs |
| `manage:sso.user` | Full management access to users |
| `read:w.credential:own` | Read only credentials owned by the caller |
| `execute:dp.transfer` | Execute data-plane transfer operations |
| `update:cp.dataset:dataset-123` | Update a specific dataset |

The `common-dtos` helpers are used by both backend and frontend code to parse and construct these values. That keeps route checks, OpenAPI metadata, token contents, and audit entries aligned around the same permission vocabulary.

## Actions

The shared action model is defined in `common-dtos` and interpreted consistently by the backend and frontend.

| Action | Description |
| --- | --- |
| `create` | Create new resources |
| `read` | View or retrieve resources |
| `update` | Modify existing resources |
| `delete` | Remove resources |
| `execute` | Trigger an operational action such as starting a transfer |
| `manage` | Super-action that subsumes the other actions for the same resource |

`manage` is treated as a superset by both the backend ABAC policy service and the shared frontend route-permission helpers.

## Resources

Resources are namespaced by domain to avoid collisions across applications.

### Control Plane

- `cp.catalog`
- `cp.dataset`
- `cp.negotiation`
- `cp.transfer`
- `cp.agreement`
- `cp.policy`
- `cp.dataplane`
- `cp.config`

### Wallet

- `w.credential`
- `w.presentation`
- `w.key`
- `w.did`
- `w.issue_config`
- `w.config`

### SSO Bridge

- `sso.user`
- `sso.client`
- `sso.role`
- `sso.config`

### Data Plane

- `dp.transfer`
- `hdp.dataplane`
- `hdp.config`
- `adp.algorithm`
- `adp.project_agreement`
- `adp.orchestration`
- `adp.file`
- `adp.dataplane`
- `adp.config`

The exact resource list is shared through `common-dtos`, allowing APIs, UIs, and docs to refer to the same vocabulary.

## Scopes

Scopes constrain how broadly a permission applies. TSG commonly uses three patterns.

| Scope | Meaning |
| --- | --- |
| omitted | Full access to the resource type |
| `*` | Explicit wildcard |
| `own` | Access only to resources owned by the caller |
| specific ID or IDs | Access to one or more named resources |

The shared policy service treats these scopes in order of breadth:

```text
all > own > specific resource IDs
```

Ownership-aware access depends on resource-specific ownership resolution. In practice that means a resource type only supports meaningful `own` checks when an `OwnershipChecker` has been registered for that resource.

The shared ownership support provides:

- a registry that maps resource types to ownership checkers
- a generic ownership service for entities that already follow the common ownable-entity pattern
- helper methods to resolve whether the current subject owns a specific resource and which resource IDs they own

If a resource type does not register ownership logic, `own` cannot be evaluated beyond the information already present in the request.

## Where Permissions Are Issued Versus Enforced

Permission issuance and permission enforcement are separate concerns.

### Issuance

The SSO Bridge is responsible for bootstrapping users, clients, and wildcard-style permission patterns in configuration and administration flows.

### Enforcement

Enforcement happens in shared infrastructure used by multiple applications:

- backend enforcement through `AbacGuard` and the `@Requires*` decorators in `common-api`
- route and menu filtering through `route-permissions.ts` in `common-ui`

This means the ABAC model belongs in shared documentation even though the SSO Bridge remains the main source of issued permissions.

## Protecting Backend Endpoints

NestJS controllers declare required permissions with the shared decorators from `common-api`. The global `AbacGuard` reads those requirements and compares them against the current request context.

Use:

- `@Requires` for one required permission
- `@RequiresAny` when any one requirement is sufficient
- `@RequiresAll` when several requirements must all be satisfied
- `@ResourceIdParam` when the route includes a concrete resource ID that should be used for scope-aware checks

```typescript
import { Requires, RequiresAny, RequiresAll, ResourceIdParam } from '@tsg-dsp/common-api';
import { Action, Resource } from '@tsg-dsp/common-dtos';

@Controller('catalogs')
export class CatalogController {
  @Get()
  @Requires(Action.READ, Resource.CP_CATALOG)
  findAll() {}

  @Post()
  @RequiresAny([
    { action: Action.CREATE, resource: Resource.CP_CATALOG },
    { action: Action.MANAGE, resource: Resource.CP_CATALOG }
  ])
  create() {}

  @Delete(':id')
  @RequiresAll([
    { action: Action.DELETE, resource: Resource.CP_CATALOG },
    { action: Action.READ, resource: Resource.CP_POLICY }
  ])
  @ResourceIdParam('id')
  remove() {}
}
```

When `@ResourceIdParam` is present, the guard can resolve the target resource ID and apply scope checks such as `own` or explicit resource lists.

This is the main way application developers influence backend authorization behavior:

1. choose the correct `Action` and `Resource`
2. decide whether one requirement, any requirement, or all requirements should apply
3. expose a concrete resource identifier when scope matters
4. register ownership logic when `own` should have resource-specific meaning

The same decorators also contribute OAuth permission metadata to generated OpenAPI output, which helps keep the documented permission requirements aligned with runtime behavior.

## Ownership And Resource-Aware Policies

`own` permissions only become useful when the platform can answer the question "does this caller own this resource?".

For common entity shapes, the shared backend already provides a generic ownership service. For other resource types, applications can register a custom ownership checker that implements the shared ownership interface.

That gives you a predictable extension point for:

- domain-specific ownership rules
- resource attribute lookup for policy decisions
- listing resource IDs owned by a caller when downstream filtering needs it

Use this extension point when you introduce new resources that should support `own` or resource-specific scope resolution.

## Delegation And Service Calls

TSG supports delegated calls where one service acts on behalf of a user. In that case, the receiving service evaluates the request using the delegated request context rather than simply trusting the service principal alone.

Shared delegation support includes:

- original actor propagation
- delegation-chain tracking
- correlation ID propagation
- effective permission transfer

The shared `AuthClientService` attaches delegation headers for user-initiated service calls, while the receiving ABAC guard reconstructs request context from those headers.

This is important for two reasons:

- a service must not escalate a user's privileges
- audit logs must show both the calling service and the original actor when delegation is involved

The shared headers preserve:

- the original actor
- the delegation chain
- the correlation ID
- the effective permissions being delegated downstream

If a call is purely service-to-service and not initiated by a user, the request should stay a service call rather than becoming a delegated user flow.

## Frontend Route Permissions

Frontend route checks use shared helpers in `common-ui` that mirror the same action-subsumption logic as the backend policy service.

This allows UIs to:

- hide routes the current user cannot access
- build navigation menus from route requirements
- stay aligned with the same `Action` and `Resource` vocabulary as the backend

Route filtering is a convenience for user experience. Real authorization is still enforced server-side.

Typical flow:

1. declare route requirements in route config
2. read the user's permission strings from the current auth state
3. filter routes with `getAccessibleRoutes`
4. build grouped menus with `generateMenuFromRoutes`

Example:

```typescript
const routes = [
  {
    path: 'audit-logs',
    name: 'AuditLogs',
    component: AuditLogView,
    requires: {
      action: Action.READ,
      resource: Resource.SSO_AUDIT_LOG
    },
    meta: {
      title: 'Audit Logs',
      group: 'admin'
    }
  }
];
```
