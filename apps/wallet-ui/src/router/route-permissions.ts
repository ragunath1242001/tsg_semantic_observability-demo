import { RouteRecordRaw } from "vue-router";

import CredentialGaiaX from "@/views/credentials/GaiaX.vue";
import CredentialImport from "@/views/credentials/Import.vue";
import CredentialOverview from "@/views/credentials/Overview.vue";
import DashboardVue from "@/views/Dashboard.vue";
import DCP from "@/views/DCP.vue";
import DIDServiceView from "@/views/DIDServices.vue";
import Manual from "@/views/issuance/Manual.vue";
import Offers from "@/views/issuance/Offers.vue";
import Requests from "@/views/issuance/Requests.vue";
import IssueConfigurationView from "@/views/IssueConfiguration.vue";
import KeysVue from "@/views/Keys.vue";
import OID4VP from "@/views/OID4VP.vue";
import SignatureVue from "@/views/Signature.vue";

export interface RouteConfig {
  path: string;
  name: string;
  component: unknown;
  requiresWrite?: boolean;
  meta?: {
    title?: string;
    icon?: string;
    group?: string;
    menuLabel?: string;
    requiresGaiaX?: boolean;
  };
}

export const routeConfigs: RouteConfig[] = [
  {
    path: "",
    name: "dashboard",
    component: DashboardVue,
    meta: {
      title: "Dashboard",
      icon: "pi pi-fw pi-id-card",
      group: "home",
      menuLabel: "Dashboard"
    }
  },
  {
    path: "services",
    name: "services",
    component: DIDServiceView,
    meta: {
      title: "DID Services",
      icon: "pi pi-fw pi-code",
      group: "did",
      menuLabel: "Services"
    }
  },
  {
    path: "keys",
    name: "keys",
    component: KeysVue,
    meta: {
      title: "Keys",
      icon: "pi pi-fw pi-key",
      group: "did",
      menuLabel: "Key management"
    }
  },
  {
    path: "signature",
    name: "signature",
    component: SignatureVue,
    requiresWrite: true,
    meta: {
      title: "Signature",
      icon: "pi pi-fw pi-verified",
      group: "did",
      menuLabel: "Signature"
    }
  },
  {
    path: "credentials",
    name: "credentials",
    component: CredentialOverview,
    meta: {
      title: "Credentials",
      icon: "pi pi-fw pi-home",
      group: "credentials",
      menuLabel: "Overview"
    }
  },
  {
    path: "credentials/import",
    name: "credentials-import",
    component: CredentialImport,
    requiresWrite: true,
    meta: {
      title: "Import Credentials",
      icon: "pi pi-fw pi-file-import",
      group: "credentials",
      menuLabel: "Import plain credential",
      requiresGaiaX: true
    }
  },
  {
    path: "credentials/gaiax",
    name: "credentials-gaiax",
    component: CredentialGaiaX,
    requiresWrite: true,
    meta: {
      title: "Gaia-X Credentials",
      icon: "pi pi-fw pi-verified",
      group: "credentials",
      menuLabel: "Gaia-X Credentials",
      requiresGaiaX: true
    }
  },
  {
    path: "issuance/manual",
    name: "issuance-manual",
    component: Manual,
    requiresWrite: true,
    meta: {
      title: "Manual Issuance",
      icon: "pi pi-fw pi-pencil",
      group: "issuance",
      menuLabel: "Manual issuance"
    }
  },
  {
    path: "issuance/offers",
    name: "issuance-offers",
    component: Offers,
    requiresWrite: true,
    meta: {
      title: "Issuance Offers",
      icon: "pi pi-fw pi-upload",
      group: "issuance",
      menuLabel: "Offers"
    }
  },
  {
    path: "issuance/requests",
    name: "issuance-requests",
    component: Requests,
    requiresWrite: true,
    meta: {
      title: "Issuance Requests",
      icon: "pi pi-fw pi-download",
      group: "issuance",
      menuLabel: "Requests"
    }
  },
  {
    path: "presentations/dcp",
    name: "dcp",
    component: DCP,
    requiresWrite: true,
    meta: {
      title: "DCP",
      icon: "pi pi-fw pi-wrench",
      group: "presentations",
      menuLabel: "DCP"
    }
  },
  {
    path: "presentations/oid4vp",
    name: "oid4vp",
    component: OID4VP,
    requiresWrite: true,
    meta: {
      title: "OID4VP",
      icon: "pi pi-fw pi-qrcode",
      group: "presentations",
      menuLabel: "OID4VP"
    }
  },
  {
    path: "issue-configuration",
    name: "issue-configuration",
    component: IssueConfigurationView,
    requiresWrite: true,
    meta: {
      title: "Issue Configuration",
      icon: "pi pi-fw pi-search-plus",
      group: "issuance",
      menuLabel: "Configurations"
    }
  }
];

export function createRouteRecords(): RouteRecordRaw[] {
  return routeConfigs.map((config) => ({
    path: config.path,
    name: config.name,
    component: config.component,
    meta: config.requiresWrite ? { requiresWrite: true } : undefined
  }));
}

export function getWriteRestrictedPaths(): string[] {
  return routeConfigs
    .filter((config) => config.requiresWrite)
    .map((config) => (config.path === "" ? "/" : `/${config.path}`));
}

export function requiresWritePermission(routeName: string): boolean {
  const config = routeConfigs.find((config) => config.name === routeName);
  return config?.requiresWrite ?? false;
}

export function getNavigationRoutes(isReadOnly: boolean): RouteConfig[] {
  return routeConfigs.filter((config) => !isReadOnly || !config.requiresWrite);
}

import { Menu } from "@tsg-dsp/common-ui/layout/AppMenu.vue";

interface RuntimeStore {
  gaiaXSupport?: boolean;
}

export function generateMenuFromRoutes(
  isReadOnly: boolean,
  runtimeStore: RuntimeStore
): Menu[] {
  const availableRoutes = getNavigationRoutes(isReadOnly);

  // Filter routes based on runtime settings
  const filteredRoutes = availableRoutes.filter((route) => {
    if (route.meta?.requiresGaiaX && !runtimeStore.gaiaXSupport) {
      return false;
    }
    return true;
  });

  // Group routes by their group metadata
  const groupedRoutes = {
    home: filteredRoutes.filter((route) => route.meta?.group === "home"),
    did: filteredRoutes.filter((route) => route.meta?.group === "did"),
    credentials: filteredRoutes.filter(
      (route) => route.meta?.group === "credentials"
    ),
    issuance: filteredRoutes.filter(
      (route) => route.meta?.group === "issuance"
    ),
    presentations: filteredRoutes.filter(
      (route) => route.meta?.group === "presentations"
    )
  };

  // Convert routes to menu items
  const createMenuItem = (route: RouteConfig) => ({
    label: route.meta?.menuLabel || route.meta?.title || route.name,
    icon: route.meta?.icon || "pi pi-fw pi-circle",
    to: route.path === "" ? "/" : `/${route.path}`
  });

  const groups = [
    { key: "home", label: "Home" },
    { key: "did", label: "DID" },
    { key: "credentials", label: "Credentials" },
    { key: "issuance", label: "Issuance" },
    { key: "presentations", label: "Presentation" }
  ];

  return groups
    .filter(
      (group) =>
        groupedRoutes[group.key as keyof typeof groupedRoutes].length > 0
    )
    .map((group) => ({
      label: group.label,
      items:
        groupedRoutes[group.key as keyof typeof groupedRoutes].map(
          createMenuItem
        )
    }));
}
