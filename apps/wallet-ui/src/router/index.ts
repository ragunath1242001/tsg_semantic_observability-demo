import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { createRouter, createWebHashHistory } from "vue-router";

import AppLayout from "@/layout/AppLayoutWallet.vue";
import AppLayoutWalletUnauthenticated from "@/layout/AppLayoutWalletUnauthenticated.vue";
import { useRuntimeStore } from "@/stores/runtime";
import ContextView from "@/views/Contexts.vue";
import CredentialGaiaX from "@/views/credentials/GaiaX.vue";
import CredentialImport from "@/views/credentials/Import.vue";
import CredentialOverview from "@/views/credentials/Overview.vue";
import DashboardVue from "@/views/Dashboard.vue";
import DCP from "@/views/DCP.vue";
import DIDServiceView from "@/views/DIDServices.vue";
import Manual from "@/views/issuance/Manual.vue";
import Offers from "@/views/issuance/Offers.vue";
import Requests from "@/views/issuance/Requests.vue";
import KeysVue from "@/views/Keys.vue";
import LoginVue from "@/views/Login.vue";
import OID4VP from "@/views/OID4VP.vue";
import SignatureVue from "@/views/Signature.vue";
import EmailCredentialRequest from "@/views/unauthenticated/EmailCredentialRequest.vue";
import Home from "@/views/unauthenticated/Home.vue";
import RetrieveCredential from "@/views/unauthenticated/RetrieveCredential.vue";

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
          path: "issuance/manual",
          name: "issuance-manual",
          component: Manual
        },
        {
          path: "issuance/offers",
          name: "issuance-offers",
          component: Offers
        },
        {
          path: "issuance/requests",
          name: "issuance-requests",
          component: Requests
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
          path: "home",
          name: "Home",
          component: Home
        },
        {
          path: "retrieve-credential",
          name: "RetrieveCredential",
          component: RetrieveCredential
        },
        {
          path: "retrieve-credential/:id",
          component: EmailCredentialRequest
        }
      ]
    }
  ]
});
router.beforeEach(async (to) => {
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ["/login"];
  const publicPrefixes = [];

  const runtimeStore = useRuntimeStore();
  await runtimeStore.loaded;

  if (runtimeStore.acceptUnauthenticatedCredentialRequests) {
    publicPages.push("/home");
  }
  if (runtimeStore.issueMobileCredentials) {
    publicPages.push("/retrieve-credential");
  }

  const anyPublicPages =
    runtimeStore.acceptUnauthenticatedCredentialRequests ||
    runtimeStore.issueMobileCredentials;
  // Check if the path starts with any of these prefixes to handle dynamic routes
  if (anyPublicPages) {
    publicPrefixes.push("/retrieve-credential/");
  }

  const authRequired =
    !publicPages.includes(to.path) &&
    !publicPrefixes.some((prefix) => to.path.startsWith(prefix));
  const store = useUserStore();
  await store.loaded;
  if (authRequired && !store.user) {
    store.returnUrl = to.fullPath;
    return "/login";
  }
});

export default router;
