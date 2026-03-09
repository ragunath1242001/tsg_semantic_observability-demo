import { Action, Resource } from "@tsg-dsp/common-dtos";
import {
  createRouteRecords as commonCreateRouteRecords,
  generateMenuFromRoutes as commonGenerateMenuFromRoutes,
  MenuGroup,
  RouteConfig
} from "@tsg-dsp/common-ui/router/route-permissions";
import { RouteRecordRaw } from "vue-router";

import CredentialGaiaX from "@/views/credentials/GaiaX.vue";
import CredentialImport from "@/views/credentials/Import.vue";
import CredentialOverview from "@/views/credentials/Overview.vue";
import DashboardVue from "@/views/Dashboard.vue";
import DIDServiceView from "@/views/DIDServices.vue";
import Manual from "@/views/issuance/Manual.vue";
import Offers from "@/views/issuance/Offers.vue";
import Requests from "@/views/issuance/Requests.vue";
import IssueConfigurationView from "@/views/IssueConfiguration.vue";
import KeysVue from "@/views/Keys.vue";
import DCP from "@/views/presentations/DCP.vue";
import OID4VP from "@/views/presentations/OID4VP.vue";
import Scopes from "@/views/presentations/Scopes.vue";
import SignatureVue from "@/views/Signature.vue";

export const routeConfigs: RouteConfig[] = [
  {
    path: "",
    name: "dashboard",
    component: DashboardVue,
    // No requires — accessible to all authenticated users
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
    requires: { action: Action.READ, resource: Resource.W_DID },
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
    requires: { action: Action.READ, resource: Resource.W_KEY },
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
    requires: { action: Action.CREATE, resource: Resource.W_DID },
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
    requires: { action: Action.READ, resource: Resource.W_CREDENTIAL },
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
    requires: { action: Action.CREATE, resource: Resource.W_CREDENTIAL },
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
    requires: { action: Action.CREATE, resource: Resource.W_CREDENTIAL },
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
    requires: { action: Action.CREATE, resource: Resource.W_CREDENTIAL },
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
    requires: { action: Action.MANAGE, resource: Resource.W_CREDENTIAL },
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
    requires: { action: Action.MANAGE, resource: Resource.W_CREDENTIAL },
    meta: {
      title: "Issuance Requests",
      icon: "pi pi-fw pi-download",
      group: "issuance",
      menuLabel: "Requests"
    }
  },
  {
    path: "presentations/scopes",
    name: "scopes",
    component: Scopes,
    requires: { action: Action.MANAGE, resource: Resource.W_PRESENTATION },
    meta: {
      title: "Scopes",
      icon: "pi pi-fw pi-globe",
      group: "presentations",
      menuLabel: "Scopes"
    }
  },
  {
    path: "presentations/dcp",
    name: "dcp",
    component: DCP,
    requires: { action: Action.CREATE, resource: Resource.W_PRESENTATION },
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
    requires: { action: Action.CREATE, resource: Resource.W_PRESENTATION },
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
    requires: { action: Action.MANAGE, resource: Resource.W_ISSUE_CONFIG },
    meta: {
      title: "Issue Configuration",
      icon: "pi pi-fw pi-search-plus",
      group: "issuance",
      menuLabel: "Configurations"
    }
  }
];

export const walletMenuGroups: MenuGroup[] = [
  { key: "home", label: "Home" },
  { key: "did", label: "DID" },
  { key: "credentials", label: "Credentials" },
  { key: "issuance", label: "Issuance" },
  { key: "presentations", label: "Presentation" }
];

interface RuntimeStore {
  gaiaXSupport?: boolean;
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
    walletMenuGroups,
    (route) => !route.meta?.requiresGaiaX || !!runtimeStore.gaiaXSupport
  );
}
