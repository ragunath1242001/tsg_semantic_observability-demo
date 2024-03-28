import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import LoginVue from "../views/Login.vue";
import DashboardVue from "../views/Dashboard.vue";
import KeysVue from "../views/Keys.vue";
import CredentialOverview from "../views/credentials/Overview.vue";
import CredentialIssue from "../views/credentials/Issue.vue";
import CredentialImport from "../views/credentials/Import.vue";
import CredentialGaiaX from "../views/credentials/GaiaX.vue";
import CredentialOID4VCI from "../views/credentials/OID4VCI.vue";

import ClientsVue from "../views/Clients.vue";
import { store } from "../store/index.js";
import Presentation from "../views/Presentation.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: [
        {
          path: "/",
          name: "dashboard",
          component: DashboardVue,
        },
        {
          path: "/keys",
          name: "keys",
          component: KeysVue,
        },
        {
          path: "/credentials",
          name: "credentials",
          component: CredentialOverview,
        },
        {
          path: "/credentials/issue",
          name: "credentials-issue",
          component: CredentialIssue,
        },
        {
          path: "/credentials/import",
          name: "credentials-import",
          component: CredentialImport,
        },
        {
          path: "/credentials/gaiax",
          name: "credentials-gaiax",
          component: CredentialGaiaX,
        },
        {
          path: "/credentials/oid4vci",
          name: "credentials-oid4vci",
          component: CredentialOID4VCI,
        },
        {
          path: "/presentation",
          name: "presentation",
          component: Presentation,
        },
        {
          path: "/clients",
          name: "clients",
          component: ClientsVue,
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: LoginVue,
    },
  ],
});
router.beforeEach(async (to) => {
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ["/login"];
  const authRequired = !publicPages.includes(to.path);

  if (authRequired && !store.state.client_info) {
    return "/login";
  }
});
export default router;
