import {
  Action,
  parsePermission,
  PermissionString,
  Resource
} from "@tsg-dsp/common-dtos";
import type { RouteRecordRaw } from "vue-router";

// Inline MenuItem/Menu to avoid importing from a .vue file
interface MenuItem {
  label: string;
  icon: string;
  to: string;
}

export interface NavigationMenu {
  label: string;
  items: MenuItem[];
}

/**
 * The minimum ABAC requirement a route needs.
 * Mirrors AbacRequirement from common-api, but scoped to route-level UI checks.
 */
export interface RouteRequirement {
  action: Action;
  resource: Resource;
}

export interface RouteConfig {
  path: string;
  name: string;
  component: unknown;
  /**
   * When set, the user must hold a permission that satisfies this requirement
   * (exact action match OR manage on the same resource) to see and access this route.
   * When undefined, the route is accessible to all authenticated users.
   */
  requires?: RouteRequirement;
  meta?: {
    title?: string;
    icon?: string;
    group?: string;
    menuLabel?: string;
    [key: string]: unknown;
  };
  badge?: string | number;
}

export interface MenuGroup {
  key: string;
  label: string;
}

/**
 * Mirrors the backend actionMatches logic:
 * MANAGE subsumes CREATE, READ, UPDATE, DELETE, EXECUTE.
 */
function actionMatches(userAction: Action, requiredAction: Action): boolean {
  if (userAction === requiredAction) return true;
  if (userAction === Action.MANAGE) {
    return [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.EXECUTE
    ].includes(requiredAction);
  }
  return false;
}

/**
 * Check whether the provided permission strings satisfy a route requirement.
 * Accounts for MANAGE subsumption just as the backend AbacPolicyService does.
 */
export function canAccessRoute(
  requirement: RouteRequirement,
  userPermissions: string[]
): boolean {
  for (const perm of userPermissions) {
    try {
      const parsed = parsePermission(perm as PermissionString);
      if (parsed.resource !== requirement.resource) continue;
      if (actionMatches(parsed.action, requirement.action)) return true;
    } catch {
      // skip malformed permission strings
    }
  }
  return false;
}

/**
 * Build the Vue Router record array from a list of RouteConfig objects.
 * The `requires` requirement is forwarded in route meta so the router guard
 * can enforce it.
 */
export function createRouteRecords(
  routeConfigs: RouteConfig[]
): RouteRecordRaw[] {
  return routeConfigs.map((config) => ({
    path: config.path,
    name: config.name,
    component: config.component as RouteRecordRaw["component"],
    meta: {
      ...config.meta,
      ...(config.requires ? { requires: config.requires } : {})
    }
  })) as RouteRecordRaw[];
}

/**
 * Filter a list of route configs to only those accessible by the given user permissions.
 *
 * @param routeConfigs  Full list of route configs
 * @param userPermissions  Raw permission strings from the user token / session
 * @param metaFilter  Optional callback for app-specific meta filtering (e.g. feature flags)
 */
export function getAccessibleRoutes(
  routeConfigs: RouteConfig[],
  userPermissions: string[],
  metaFilter?: (config: RouteConfig) => boolean
): RouteConfig[] {
  return routeConfigs.filter((config) => {
    if (config.requires && !canAccessRoute(config.requires, userPermissions)) {
      return false;
    }
    if (metaFilter && !metaFilter(config)) {
      return false;
    }
    return true;
  });
}

/**
 * Generate a grouped navigation menu from route configs.
 *
 * @param routeConfigs  Full list of route configs
 * @param userPermissions  Raw permission strings from the user token / session
 * @param groups  Ordered list of menu groups to render
 * @param metaFilter  Optional callback for app-specific meta filtering (e.g. feature flags)
 */
export function generateMenuFromRoutes(
  routeConfigs: RouteConfig[],
  userPermissions: string[],
  groups: MenuGroup[],
  metaFilter?: (config: RouteConfig) => boolean
): NavigationMenu[] {
  const accessible = getAccessibleRoutes(
    routeConfigs,
    userPermissions,
    metaFilter
  );

  const createMenuItem = (route: RouteConfig) => ({
    label:
      (route.meta?.menuLabel as string) ||
      (route.meta?.title as string) ||
      route.name,
    icon: (route.meta?.icon as string) || "pi pi-fw pi-circle",
    to: route.path === "" ? "/" : `/${route.path}`
  });

  return groups
    .map((group) => ({
      label: group.label,
      items: accessible
        .filter((route) => route.meta?.group === group.key)
        .map(createMenuItem)
    }))
    .filter((group) => group.items.length > 0);
}
