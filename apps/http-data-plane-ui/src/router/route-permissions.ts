import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  createRouteRecords as commonCreateRouteRecords,
  generateMenuFromRoutes as commonGenerateMenuFromRoutes,
  MenuGroup,
  RouteConfig
} from "@tsg-dsp/common-ui/router/route-permissions";
import AuditLogView from "@tsg-dsp/common-ui/views/AuditLogView.vue";
import { RouteRecordRaw } from "vue-router";

import Dashboard from "../views/Dashboard.vue";
import Logging from "../views/Logging.vue";
import Metadata from "../views/Metadata.vue";
import SemanticObservabilityView from "../views/SemanticObservability.vue";
import Tester from "../views/Tester.vue";

export const routeConfigs: RouteConfig[] = [
  {
    path: "",
    name: "dashboard",
    component: Dashboard,
    // No requires — accessible to all authenticated users
    meta: {
      title: "Dashboard",
      icon: "pi pi-fw pi-id-card",
      group: "home",
      menuLabel: "Dashboard"
    }
  },
  {
    path: "metadata",
    name: "metadata",
    component: Metadata,
    requires: { action: Action.READ, resource: Resource.HDP_DATAPLANE },
    meta: {
      title: "Metadata",
      icon: "pi pi-fw pi-file",
      group: "home",
      menuLabel: "Metadata"
    }
  },
  {
    path: "logging",
    name: "logging",
    component: Logging,
    requires: { action: Action.READ, resource: Resource.HDP_LOGS },
    meta: {
      title: "Logging",
      icon: "pi pi-fw pi-list",
      group: "home",
      menuLabel: "Logging"
    }
  },
  {
    path: "tester",
    name: "tester",
    component: Tester,
    requires: { action: Action.EXECUTE, resource: Resource.HDP_DATAPLANE },
    meta: {
      title: "Tester",
      icon: "pi pi-fw pi-cog",
      group: "home",
      menuLabel: "Tester"
    }
  },
  {
    path: "tester/:id",
    name: "tester-detail",
    component: Tester,
    requires: { action: Action.EXECUTE, resource: Resource.HDP_DATAPLANE }
    // No group — dynamic detail page, not shown in menu
  },
  {
    path: "audit-logs",
    name: "audit-logs",
    component: AuditLogView,
    requires: { action: Action.READ, resource: Resource.HDP_AUDIT_LOG },
    meta: {
      title: "Audit Logs",
      icon: "pi pi-fw pi-shield",
      group: "audit",
      menuLabel: "Audit Logs"
    }
  },
  {
    path: "semantic-observability",
    name: "semantic-observability",
    component: SemanticObservabilityView,
    requires: {
      action: Action.READ,
      resource: Resource.HDP_SEMANTIC_OBSERVABILITY
    },
    meta: {
      title: "Semantic Observability",
      icon: "pi pi-fw pi-chart-line",
      group: "audit",
      menuLabel: "Semantic Observability"
    }
  }
];

export const hdpMenuGroups: MenuGroup[] = [
  { key: "home", label: "Home" },
  { key: "audit", label: "Audit" }
];

export function createRouteRecords(): RouteRecordRaw[] {
  return commonCreateRouteRecords(routeConfigs);
}

export function generateMenuFromRoutes(userPermissions: string[]) {
  return commonGenerateMenuFromRoutes(
    routeConfigs,
    userPermissions,
    hdpMenuGroups
  );
}
