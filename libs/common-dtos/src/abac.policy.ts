import {
  Action,
  PermissionString,
  RESERVED_SCOPES,
  Resource
} from "./permissions.js";

export type ActorType = "user" | "service" | "system";

export interface RequestActor {
  sub: string;
  type: ActorType;
  serviceName?: string;
  permissions?: PermissionString[];
  didId?: string;
  email?: string;
  [key: string]: unknown;
}

export interface SubjectAttributes extends RequestActor {
  permissions: PermissionString[];
}

export interface DelegationContext {
  originalActor: RequestActor;
  delegationChain: RequestActor[];
  originTimestamp: Date;
  correlationId: string;
  effectivePermissions: PermissionString[];
}

export interface ResourceAttributes {
  type: Resource;
  id?: string;
  ownerId?: string;
  ownerIdentifier?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export interface EnvironmentAttributes {
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface RequestContext {
  caller: RequestActor;
  delegation?: DelegationContext;
  isOnBehalfOf: boolean;
  environment: EnvironmentAttributes;
}

export interface PolicyContext {
  subject: SubjectAttributes;
  action: Action;
  resource: ResourceAttributes;
  environment: EnvironmentAttributes;
  delegation?: DelegationContext;
}

export type EffectiveScope =
  | typeof RESERVED_SCOPES.ALL
  | typeof RESERVED_SCOPES.OWN
  | "specific";

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  matchedPermission?: PermissionString;
  effectiveScope?: EffectiveScope;
  allowedResourceIds?: string[];
}
