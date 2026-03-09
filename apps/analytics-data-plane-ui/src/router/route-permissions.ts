import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  createRouteRecords as commonCreateRouteRecords,
  generateMenuFromRoutes as commonGenerateMenuFromRoutes,
  MenuGroup,
  RouteConfig
} from "@tsg-dsp/common-ui/router/route-permissions";
import { RouteRecordRaw } from "vue-router";

import Dashboard from "../views/Dashboard.vue";
import Files from "../views/Files.vue";
import AlgorithmInstances from "../views/instances/AlgorithmInstances.vue";
import CreateAlgorithmInstance from "../views/instances/CreateAlgorithmInstance.vue";
import InstanceDetails from "../views/instances/InstanceDetails.vue";
import Metadata from "../views/Metadata.vue";
import ProjectAgreements from "../views/ProjectAgreements.vue";
import ConsumerView from "../views/transfers/ConsumerView.vue";
import ProviderView from "../views/transfers/ProviderView.vue";

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
    requires: { action: Action.READ, resource: Resource.ADP_DATAPLANE },
    meta: {
      title: "Metadata",
      icon: "pi pi-fw pi-file",
      group: "home",
      menuLabel: "Metadata",
      restrictedInClientMode: true
    }
  },
  {
    path: "files",
    name: "files",
    component: Files,
    requires: { action: Action.READ, resource: Resource.ADP_FILE },
    meta: {
      title: "Files",
      icon: "pi pi-fw pi-folder-open",
      group: "files",
      menuLabel: "Files",
      restrictedInServerMode: true
    }
  },
  {
    path: "algorithms/create-instance",
    name: "algorithm-create-instance",
    component: CreateAlgorithmInstance,
    requires: { action: Action.CREATE, resource: Resource.ADP_ALGORITHM },
    meta: {
      title: "Create Instance",
      icon: "pi pi-fw pi-sparkles",
      group: "algorithms",
      menuLabel: "Create instance",
      restrictedInClientMode: true
    }
  },
  {
    path: "algorithms/instances",
    name: "algorithm-instances",
    component: AlgorithmInstances,
    requires: { action: Action.READ, resource: Resource.ADP_ALGORITHM },
    meta: {
      title: "Algorithm Instances",
      icon: "pi pi-fw pi-chart-line",
      group: "algorithms",
      menuLabel: "Instances"
    }
  },
  {
    path: "algorithms/instances/:id",
    name: "algorithm-instance-details",
    component: InstanceDetails,
    requires: { action: Action.READ, resource: Resource.ADP_ALGORITHM }
    // No group — detail page, not shown in menu
  },
  {
    path: "project-agreements",
    name: "project-agreements",
    component: ProjectAgreements,
    requires: { action: Action.READ, resource: Resource.ADP_PROJECT_AGREEMENT },
    meta: {
      title: "Project Agreements",
      icon: "pi pi-fw pi-file-edit",
      group: "collaboration",
      menuLabel: "Project Agreements",
      restrictedInClientMode: true
    }
  },
  {
    path: "provider/:id",
    name: "provider",
    component: ProviderView,
    requires: { action: Action.READ, resource: Resource.DP_TRANSFER }
    // No group — detail page, not shown in menu
  },
  {
    path: "consumer/:id",
    name: "consumer",
    component: ConsumerView,
    requires: { action: Action.READ, resource: Resource.DP_TRANSFER }
    // No group — detail page, not shown in menu
  }
];

export const adpMenuGroups: MenuGroup[] = [
  { key: "home", label: "Home" },
  { key: "files", label: "Files" },
  { key: "algorithms", label: "Algorithms" },
  { key: "collaboration", label: "Collaboration" }
];

interface RuntimeStore {
  isClientMode: boolean;
  isServerMode: boolean;
}

export function createRouteRecords(): RouteRecordRaw[] {
  return commonCreateRouteRecords(routeConfigs);
}

export function generateMenuFromRoutes(
  userPermissions: string[],
  runtimeStore: RuntimeStore
) {
  return commonGenerateMenuFromRoutes(
    routeConfigs,
    userPermissions,
    adpMenuGroups,
    (route) => {
      if (route.meta?.restrictedInClientMode && runtimeStore.isClientMode)
        return false;
      if (route.meta?.restrictedInServerMode && runtimeStore.isServerMode)
        return false;
      return true;
    }
  );
}
