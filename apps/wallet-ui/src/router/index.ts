import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayoutWallet.vue";
import LoginVue from "../views/Login.vue";
import DashboardVue from "../views/Dashboard.vue";
import KeysVue from "../views/Keys.vue";
import SignatureVue from "../views/Signature.vue";
import CredentialOverview from "../views/credentials/Overview.vue";
import CredentialIssue from "../views/credentials/Issue.vue";
import CredentialImport from "../views/credentials/Import.vue";
import CredentialGaiaX from "../views/credentials/GaiaX.vue";
import CredentialOID4VCI from "../views/credentials/OID4VCI.vue";
import DIDServiceView from "../views/DIDServices.vue";
import ContextView from "../views/Contexts.vue";
import DCP from "../views/DCP.vue";
import OID4VP from "../views/OID4VP.vue";
import { registerRouter, useUserStore } from "@tsg-dsp/common-ui/stores/user";
import AppLayoutWalletUnauthenticated from "@/layout/AppLayoutWalletUnauthenticated.vue";
import RetrieveCredential from "@/views/credentials/RetrieveCredential.vue";
import EmailQR from "@/views/credentials/EmailQR.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: [
        {
          path: "",
          name: "dashboard",
          component: DashboardVue
        },
        {
          path: "keys",
          name: "keys",
          component: KeysVue
        },
        {
          path: "signature",
          name: "signature",
          component: SignatureVue
        },
        {
          path: "credentials",
          name: "credentials",
          component: CredentialOverview
        },
        {
          path: "credentials/issue",
          name: "credentials-issue",
          component: CredentialIssue
        },
        {
          path: "credentials/import",
          name: "credentials-import",
          component: CredentialImport
        },
        {
          path: "credentials/gaiax",
          name: "credentials-gaiax",
          component: CredentialGaiaX
        },
        {
          path: "credentials/oid4vci",
          name: "credentials-oid4vci",
          component: CredentialOID4VCI
        },
        {
          path: "presentations/dcp",
          name: "dcp",
          component: DCP
        },
        {
          path: "presentations/oid4vp",
          name: "oid4vp",
          component: OID4VP
        },
        {
          path: "services",
          name: "services",
          component: DIDServiceView
        },
        {
          path: "contexts",
          name: "contexts",
          component: ContextView
        }
      ]
    },
    {
      path: "/login",
      name: "login",
      component: LoginVue
    },
    {
      path: "/",
      component: AppLayoutWalletUnauthenticated,
      children: [
        {
          path: "retrieve-credential",
          name: "RetrieveCredential",
          component: RetrieveCredential
        },
        {
          path: "retrieve-credential/:id",
          component: EmailQR
        }
      ]
    }
  ]
});
router.beforeEach(async (to) => {
  console.log("route naviation", to);
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ["/login", "/retrieve-credential"];

  // Check if the path starts with any of these prefixes to handle dynamic routes
  const publicPrefixes = ["/retrieve-credential/"];

  const authRequired =
    !publicPages.includes(to.path) &&
    !publicPrefixes.some((prefix) => to.path.startsWith(prefix));
  const store = useUserStore();

  if (authRequired && !store.user) {
    store.returnUrl = to.fullPath;
    return "/login";
  }
});

registerRouter(router);

export default router;
