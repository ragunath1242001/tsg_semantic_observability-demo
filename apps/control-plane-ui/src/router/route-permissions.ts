import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  createRouteRecords as commonCreateRouteRecords,
  generateMenuFromRoutes as commonGenerateMenuFromRoutes,
  MenuGroup,
  RouteConfig
} from "@tsg-dsp/common-ui/router/route-permissions";
import { RouteRecordRaw } from "vue-router";

import CatalogVue from "../views/Catalog.vue";
import DashboardVue from "../views/Dashboard.vue";
import DataplaneVue from "../views/Dataplane.vue";
import NegotiationsVue from "../views/Negotiations.vue";
import OwnCatalog from "../views/OwnCatalog.vue";
import Registry from "../views/Registry.vue";
import TransfersVue from "../views/Transfers.vue";

export const routeConfigs: RouteConfig[] = [
  {
    path: "",
    name: "dashboard",
    component: DashboardVue,
    // No requires — accessible to all authenticated users
    meta: {
      title: "Dashboard",
      icon: "pi pi-fw pi-home",
      group: "home",
      menuLabel: "Dashboard"
    }
  },
  {
    path: "catalog",
    name: "owncatalog",
    component: OwnCatalog,
    requires: { action: Action.READ, resource: Resource.CP_DATASET },
    meta: {
      title: "Own Catalog",
      icon: "pi pi-fw pi-warehouse",
      group: "home",
      menuLabel: "Own Catalog"
    }
  },
  {
    path: "dataplanes",
    name: "dataplanes",
    component: DataplaneVue,
    requires: { action: Action.READ, resource: Resource.CP_DATAPLANE },
    meta: {
      title: "Dataplanes",
      icon: "pi pi-fw pi-database",
      group: "home",
      menuLabel: "Dataplanes"
    }
  },
  {
    path: "registry",
    name: "registry",
    component: Registry,
    requires: { action: Action.READ, resource: Resource.CP_REGISTRY },
    meta: {
      title: "Federated Catalog",
      icon: "pi pi-fw pi-address-book",
      group: "home",
      menuLabel: "Federated Catalog"
    }
  },
  {
    path: "catalog/request",
    name: "catalogrequest",
    component: CatalogVue,
    requires: { action: Action.READ, resource: Resource.CP_CATALOG },
    meta: {
      title: "Catalog Request",
      icon: "pi pi-fw pi-book",
      group: "dsp",
      menuLabel: "Catalog Request"
    }
  },
  {
    path: "negotiations",
    name: "negotiations",
    component: NegotiationsVue,
    requires: { action: Action.READ, resource: Resource.CP_NEGOTIATION },
    meta: {
      title: "Negotiations",
      icon: "pi pi-fw pi-comments",
      group: "dsp",
      menuLabel: "Negotiations"
    }
  },
  {
    path: "transfers",
    name: "transfers",
    component: TransfersVue,
    requires: { action: Action.READ, resource: Resource.CP_TRANSFER },
    meta: {
      title: "Transfers",
      icon: "pi pi-fw pi-arrow-right-arrow-left",
      group: "dsp",
      menuLabel: "Transfers"
    }
  }
];

export const cpMenuGroups: MenuGroup[] = [
  { key: "home", label: "Home" },
  { key: "dsp", label: "Dataspace Protocol" }
];

export function createRouteRecords(): RouteRecordRaw[] {
  return commonCreateRouteRecords(routeConfigs);
}

export function generateMenuFromRoutes(userPermissions: string[]) {
  return commonGenerateMenuFromRoutes(
    routeConfigs,
    userPermissions,
    cpMenuGroups
  );
}
