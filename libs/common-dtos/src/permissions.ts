export enum Action {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  EXECUTE = "execute",
  MANAGE = "manage"
}

/**
 * Resource namespaces to prevent permission collision across subprojects.
 * Resources are namespaced by their service/component to ensure that
 * permissions granted for one service don't accidentally grant access to another.
 *
 * Format: namespace.resource (e.g., "cp.catalog" for control plane catalog)
 *
 * Namespaces:
 * - cp: Control Plane
 * - adp: Analytics Data Plane
 * - hdp: HTTP Data Plane
 * - w: Wallet
 * - sso: SSO Bridge
 * - (none): Shared resources that are truly global
 */
export enum Resource {
  // ===========================================
  // Control Plane Resources (cp.*)
  // ===========================================
  CP_CATALOG = "cp.catalog",
  CP_DATASET = "cp.dataset",
  CP_NEGOTIATION = "cp.negotiation",
  CP_TRANSFER = "cp.transfer",
  CP_AGREEMENT = "cp.agreement",
  CP_DATAPLANE = "cp.dataplane",
  CP_REGISTRY = "cp.registry",
  CP_POLICY = "cp.policy",
  CP_CONFIG = "cp.config",

  // ===========================================
  // Common Data Plane Resources (no namespace)
  // ===========================================
  DP_TRANSFER = "dp.transfer",

  // ===========================================
  // Analytics Data Plane Resources (adp.*)
  // ===========================================
  ADP_ALGORITHM = "adp.algorithm",
  ADP_PROJECT_AGREEMENT = "adp.project_agreement",
  ADP_ORCHESTRATION = "adp.orchestration",
  ADP_FILE = "adp.file",
  ADP_DATAPLANE = "adp.dataplane",
  ADP_CONFIG = "adp.config",

  // ===========================================
  // HTTP Data Plane Resources (hdp.*)
  // ===========================================
  HDP_DATAPLANE = "hdp.dataplane",
  HDP_CONFIG = "hdp.config",
  HDP_LOGS = "hdp.logs",

  // ===========================================
  // Wallet Resources (w.*)
  // ===========================================
  W_CREDENTIAL = "w.credential",
  W_PRESENTATION = "w.presentation",
  W_KEY = "w.key",
  W_DID = "w.did",
  W_ISSUE_CONFIG = "w.issue_config",
  W_CONFIG = "w.config",

  // ===========================================
  // SSO Bridge Resources (sso.*)
  // ===========================================
  SSO_USER = "sso.user",
  SSO_CLIENT = "sso.client",
  SSO_ROLE = "sso.role",
  SSO_CONFIG = "sso.config",
  SSO_LOGS = "sso.logs"
}

export const RESERVED_SCOPES = {
  ALL: "*",
  OWN: "own"
} as const;

export interface Permission {
  action: Action;
  resource: Resource;
  scope?: string | string[];
}

export type PermissionString =
  | `${Action}:${Resource}`
  | `${Action}:${Resource}:${string}`;

export function permission(
  action: Action,
  resource: Resource,
  scope?: string | string[]
): PermissionString {
  if (!scope || scope === RESERVED_SCOPES.ALL) {
    return `${action}:${resource}`;
  }
  if (Array.isArray(scope)) {
    return `${action}:${resource}:${scope.join(",")}`;
  }
  return `${action}:${resource}:${scope}`;
}

export function parsePermission(perm: PermissionString): Permission {
  // Permission format: action:resource[:scope]
  // Resource can be namespaced (e.g., cp.catalog, adp.algorithm)
  // Examples:
  //   - read:cp.catalog -> action=read, resource=cp.catalog
  //   - manage:w.credential:own -> action=manage, resource=w.credential, scope=own
  //   - read:catalog -> action=read, resource=catalog (legacy)
  const parts = perm.split(":");

  if (parts.length < 2) {
    throw new Error(`Invalid permission format: ${perm}`);
  }

  const result: Permission = {
    action: parts[0] as Action,
    resource: parts[1] as Resource
  };

  if (parts.length > 2) {
    const scopePart = parts.slice(2).join(":"); // Rejoin in case scope contains colons
    if (scopePart === RESERVED_SCOPES.ALL) {
      result.scope = RESERVED_SCOPES.ALL;
    } else if (scopePart === RESERVED_SCOPES.OWN) {
      result.scope = RESERVED_SCOPES.OWN;
    } else if (scopePart.includes(",")) {
      result.scope = scopePart.split(",");
    } else {
      result.scope = scopePart;
    }
  }

  return result;
}

export function permissionAllowsResourceId(
  perm: Permission,
  resourceId: string
): boolean {
  if (!perm.scope || perm.scope === RESERVED_SCOPES.ALL) {
    return true;
  }

  if (perm.scope === RESERVED_SCOPES.OWN) {
    return false;
  }

  if (Array.isArray(perm.scope)) {
    return perm.scope.includes(resourceId);
  }

  return perm.scope === resourceId;
}

export function isOwnScope(perm: Permission): boolean {
  return perm.scope === RESERVED_SCOPES.OWN;
}

export function isAllScope(perm: Permission): boolean {
  return !perm.scope || perm.scope === RESERVED_SCOPES.ALL;
}

export function isSpecificScope(perm: Permission): boolean {
  if (!perm.scope) return false;
  if (perm.scope === RESERVED_SCOPES.ALL) return false;
  if (perm.scope === RESERVED_SCOPES.OWN) return false;
  return true;
}

export const Permissions = {
  // ===========================================
  // Control Plane Permissions (cp.*)
  // ===========================================
  CP_CATALOG_READ: permission(Action.READ, Resource.CP_CATALOG),
  CP_CATALOG_CREATE: permission(Action.CREATE, Resource.CP_CATALOG),
  CP_CATALOG_UPDATE: permission(Action.UPDATE, Resource.CP_CATALOG),
  CP_CATALOG_DELETE: permission(Action.DELETE, Resource.CP_CATALOG),
  CP_CATALOG_MANAGE: permission(Action.MANAGE, Resource.CP_CATALOG),

  CP_DATASET_READ: permission(Action.READ, Resource.CP_DATASET),
  CP_DATASET_CREATE: permission(Action.CREATE, Resource.CP_DATASET),
  CP_DATASET_UPDATE: permission(Action.UPDATE, Resource.CP_DATASET),
  CP_DATASET_DELETE: permission(Action.DELETE, Resource.CP_DATASET),
  CP_DATASET_MANAGE: permission(Action.MANAGE, Resource.CP_DATASET),

  CP_NEGOTIATION_READ: permission(Action.READ, Resource.CP_NEGOTIATION),
  CP_NEGOTIATION_CREATE: permission(Action.CREATE, Resource.CP_NEGOTIATION),
  CP_NEGOTIATION_EXECUTE: permission(Action.EXECUTE, Resource.CP_NEGOTIATION),
  CP_NEGOTIATION_MANAGE: permission(Action.MANAGE, Resource.CP_NEGOTIATION),

  CP_TRANSFER_READ: permission(Action.READ, Resource.CP_TRANSFER),
  CP_TRANSFER_CREATE: permission(Action.CREATE, Resource.CP_TRANSFER),
  CP_TRANSFER_EXECUTE: permission(Action.EXECUTE, Resource.CP_TRANSFER),
  CP_TRANSFER_MANAGE: permission(Action.MANAGE, Resource.CP_TRANSFER),

  CP_AGREEMENT_READ: permission(Action.READ, Resource.CP_AGREEMENT),
  CP_AGREEMENT_CREATE: permission(Action.CREATE, Resource.CP_AGREEMENT),
  CP_AGREEMENT_DELETE: permission(Action.DELETE, Resource.CP_AGREEMENT),
  CP_AGREEMENT_MANAGE: permission(Action.MANAGE, Resource.CP_AGREEMENT),

  CP_POLICY_READ: permission(Action.READ, Resource.CP_POLICY),
  CP_POLICY_CREATE: permission(Action.CREATE, Resource.CP_POLICY),
  CP_POLICY_UPDATE: permission(Action.UPDATE, Resource.CP_POLICY),
  CP_POLICY_DELETE: permission(Action.DELETE, Resource.CP_POLICY),
  CP_POLICY_EXECUTE: permission(Action.EXECUTE, Resource.CP_POLICY),
  CP_POLICY_MANAGE: permission(Action.MANAGE, Resource.CP_POLICY),

  CP_DATAPLANE_READ: permission(Action.READ, Resource.CP_DATAPLANE),
  CP_DATAPLANE_CREATE: permission(Action.CREATE, Resource.CP_DATAPLANE),
  CP_DATAPLANE_UPDATE: permission(Action.UPDATE, Resource.CP_DATAPLANE),
  CP_DATAPLANE_DELETE: permission(Action.DELETE, Resource.CP_DATAPLANE),
  CP_DATAPLANE_MANAGE: permission(Action.MANAGE, Resource.CP_DATAPLANE),

  CP_CONFIG_READ: permission(Action.READ, Resource.CP_CONFIG),
  CP_CONFIG_MANAGE: permission(Action.MANAGE, Resource.CP_CONFIG),

  // ===========================================
  // Common Data Plane Permissions (dp.*)
  // ===========================================
  DP_TRANSFER_READ: permission(Action.READ, Resource.DP_TRANSFER),
  DP_TRANSFER_CREATE: permission(Action.CREATE, Resource.DP_TRANSFER),
  DP_TRANSFER_UPDATE: permission(Action.UPDATE, Resource.DP_TRANSFER),
  DP_TRANSFER_DELETE: permission(Action.DELETE, Resource.DP_TRANSFER),
  DP_TRANSFER_EXECUTE: permission(Action.EXECUTE, Resource.DP_TRANSFER),
  DP_TRANSFER_MANAGE: permission(Action.MANAGE, Resource.DP_TRANSFER),

  // ===========================================
  // Analytics Data Plane Permissions (adp.*)
  // ===========================================
  ADP_ALGORITHM_READ: permission(Action.READ, Resource.ADP_ALGORITHM),
  ADP_ALGORITHM_CREATE: permission(Action.CREATE, Resource.ADP_ALGORITHM),
  ADP_ALGORITHM_UPDATE: permission(Action.UPDATE, Resource.ADP_ALGORITHM),
  ADP_ALGORITHM_DELETE: permission(Action.DELETE, Resource.ADP_ALGORITHM),
  ADP_ALGORITHM_EXECUTE: permission(Action.EXECUTE, Resource.ADP_ALGORITHM),
  ADP_ALGORITHM_MANAGE: permission(Action.MANAGE, Resource.ADP_ALGORITHM),

  ADP_ORCHESTRATION_READ: permission(Action.READ, Resource.ADP_ORCHESTRATION),
  ADP_ORCHESTRATION_CREATE: permission(
    Action.CREATE,
    Resource.ADP_ORCHESTRATION
  ),
  ADP_ORCHESTRATION_UPDATE: permission(
    Action.UPDATE,
    Resource.ADP_ORCHESTRATION
  ),
  ADP_ORCHESTRATION_DELETE: permission(
    Action.DELETE,
    Resource.ADP_ORCHESTRATION
  ),
  ADP_ORCHESTRATION_EXECUTE: permission(
    Action.EXECUTE,
    Resource.ADP_ORCHESTRATION
  ),
  ADP_ORCHESTRATION_MANAGE: permission(
    Action.MANAGE,
    Resource.ADP_ORCHESTRATION
  ),

  ADP_FILE_READ: permission(Action.READ, Resource.ADP_FILE),
  ADP_FILE_CREATE: permission(Action.CREATE, Resource.ADP_FILE),
  ADP_FILE_UPDATE: permission(Action.UPDATE, Resource.ADP_FILE),
  ADP_FILE_DELETE: permission(Action.DELETE, Resource.ADP_FILE),
  ADP_FILE_EXECUTE: permission(Action.EXECUTE, Resource.ADP_FILE),
  ADP_FILE_MANAGE: permission(Action.MANAGE, Resource.ADP_FILE),

  ADP_PROJECT_AGREEMENT_READ: permission(
    Action.READ,
    Resource.ADP_PROJECT_AGREEMENT
  ),
  ADP_PROJECT_AGREEMENT_CREATE: permission(
    Action.CREATE,
    Resource.ADP_PROJECT_AGREEMENT
  ),
  ADP_PROJECT_AGREEMENT_UPDATE: permission(
    Action.UPDATE,
    Resource.ADP_PROJECT_AGREEMENT
  ),
  ADP_PROJECT_AGREEMENT_EXECUTE: permission(
    Action.EXECUTE,
    Resource.ADP_PROJECT_AGREEMENT
  ),
  ADP_PROJECT_AGREEMENT_MANAGE: permission(
    Action.MANAGE,
    Resource.ADP_PROJECT_AGREEMENT
  ),

  ADP_DATAPLANE_READ: permission(Action.READ, Resource.ADP_DATAPLANE),
  ADP_DATAPLANE_EXECUTE: permission(Action.EXECUTE, Resource.ADP_DATAPLANE),
  ADP_DATAPLANE_MANAGE: permission(Action.MANAGE, Resource.ADP_DATAPLANE),

  ADP_CONFIG_READ: permission(Action.READ, Resource.ADP_CONFIG),
  ADP_CONFIG_MANAGE: permission(Action.MANAGE, Resource.ADP_CONFIG),

  // ===========================================
  // HTTP Data Plane Permissions (hdp.*)
  // ===========================================
  HDP_DATAPLANE_READ: permission(Action.READ, Resource.HDP_DATAPLANE),
  HDP_DATAPLANE_UPDATE: permission(Action.UPDATE, Resource.HDP_DATAPLANE),
  HDP_DATAPLANE_EXECUTE: permission(Action.EXECUTE, Resource.HDP_DATAPLANE),
  HDP_DATAPLANE_MANAGE: permission(Action.MANAGE, Resource.HDP_DATAPLANE),

  HDP_CONFIG_READ: permission(Action.READ, Resource.HDP_CONFIG),
  HDP_CONFIG_MANAGE: permission(Action.MANAGE, Resource.HDP_CONFIG),

  HDP_LOGS_READ: permission(Action.READ, Resource.HDP_LOGS),
  HDP_LOGS_MANAGE: permission(Action.MANAGE, Resource.HDP_LOGS),

  // ===========================================
  // Wallet Permissions (w.*)
  // ===========================================
  W_CREDENTIAL_READ_OWN: permission(
    Action.READ,
    Resource.W_CREDENTIAL,
    RESERVED_SCOPES.OWN
  ),
  W_CREDENTIAL_READ: permission(Action.READ, Resource.W_CREDENTIAL),
  W_CREDENTIAL_CREATE: permission(Action.CREATE, Resource.W_CREDENTIAL),
  W_CREDENTIAL_UPDATE: permission(Action.UPDATE, Resource.W_CREDENTIAL),
  W_CREDENTIAL_DELETE: permission(Action.DELETE, Resource.W_CREDENTIAL),
  W_CREDENTIAL_MANAGE_OWN: permission(
    Action.MANAGE,
    Resource.W_CREDENTIAL,
    RESERVED_SCOPES.OWN
  ),
  W_CREDENTIAL_MANAGE: permission(Action.MANAGE, Resource.W_CREDENTIAL),

  W_KEY_READ: permission(Action.READ, Resource.W_KEY),
  W_KEY_CREATE: permission(Action.CREATE, Resource.W_KEY),
  W_KEY_UPDATE: permission(Action.UPDATE, Resource.W_KEY),
  W_KEY_DELETE: permission(Action.DELETE, Resource.W_KEY),
  W_KEY_EXECUTE: permission(Action.EXECUTE, Resource.W_KEY),
  W_KEY_MANAGE: permission(Action.MANAGE, Resource.W_KEY),

  W_DID_READ: permission(Action.READ, Resource.W_DID),
  W_DID_CREATE: permission(Action.CREATE, Resource.W_DID),
  W_DID_UPDATE: permission(Action.UPDATE, Resource.W_DID),
  W_DID_DELETE: permission(Action.DELETE, Resource.W_DID),
  W_DID_MANAGE: permission(Action.MANAGE, Resource.W_DID),

  W_PRESENTATION_READ: permission(Action.READ, Resource.W_PRESENTATION),
  W_PRESENTATION_CREATE: permission(Action.CREATE, Resource.W_PRESENTATION),
  W_PRESENTATION_MANAGE: permission(Action.MANAGE, Resource.W_PRESENTATION),

  W_ISSUE_CONFIG_READ: permission(Action.READ, Resource.W_ISSUE_CONFIG),
  W_ISSUE_CONFIG_CREATE: permission(Action.CREATE, Resource.W_ISSUE_CONFIG),
  W_ISSUE_CONFIG_UPDATE: permission(Action.UPDATE, Resource.W_ISSUE_CONFIG),
  W_ISSUE_CONFIG_DELETE: permission(Action.DELETE, Resource.W_ISSUE_CONFIG),
  W_ISSUE_CONFIG_MANAGE: permission(Action.MANAGE, Resource.W_ISSUE_CONFIG),

  W_CONFIG_READ: permission(Action.READ, Resource.W_CONFIG),
  W_CONFIG_MANAGE: permission(Action.MANAGE, Resource.W_CONFIG),

  // ===========================================
  // SSO Bridge Permissions (sso.*)
  // ===========================================
  SSO_USER_READ: permission(Action.READ, Resource.SSO_USER),
  SSO_USER_CREATE: permission(Action.CREATE, Resource.SSO_USER),
  SSO_USER_UPDATE: permission(Action.UPDATE, Resource.SSO_USER),
  SSO_USER_DELETE: permission(Action.DELETE, Resource.SSO_USER),
  SSO_USER_EXECUTE: permission(Action.EXECUTE, Resource.SSO_USER),
  SSO_USER_MANAGE: permission(Action.MANAGE, Resource.SSO_USER),

  SSO_CLIENT_READ: permission(Action.READ, Resource.SSO_CLIENT),
  SSO_CLIENT_CREATE: permission(Action.CREATE, Resource.SSO_CLIENT),
  SSO_CLIENT_UPDATE: permission(Action.UPDATE, Resource.SSO_CLIENT),
  SSO_CLIENT_DELETE: permission(Action.DELETE, Resource.SSO_CLIENT),
  SSO_CLIENT_MANAGE: permission(Action.MANAGE, Resource.SSO_CLIENT),

  SSO_ROLE_READ: permission(Action.READ, Resource.SSO_ROLE),
  SSO_ROLE_MANAGE: permission(Action.MANAGE, Resource.SSO_ROLE),

  SSO_CONFIG_READ: permission(Action.READ, Resource.SSO_CONFIG),
  SSO_CONFIG_MANAGE: permission(Action.MANAGE, Resource.SSO_CONFIG),

  SSO_LOGS_READ: permission(Action.READ, Resource.SSO_LOGS)
} as const;
