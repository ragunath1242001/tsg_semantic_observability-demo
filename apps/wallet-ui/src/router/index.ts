import { RouteRequirement } from "@tsg-dsp/common-ui/router/route-permissions";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import {
  createRouter,
  createWebHashHistory,
  type RouteRecordRaw
} from "vue-router";

import AppLayout from "@/layout/AppLayoutWallet.vue";
import AppLayoutWalletUnauthenticated from "@/layout/AppLayoutWalletUnauthenticated.vue";
import { useRuntimeStore } from "@/stores/runtime";
import LoginVue from "@/views/Login.vue";
import EmailCredentialRequest from "@/views/unauthenticated/EmailCredentialRequest.vue";
import Home from "@/views/unauthenticated/Home.vue";
import MobileDebug from "@/views/unauthenticated/MobileDebug.vue";
import RetrieveCredential from "@/views/unauthenticated/RetrieveCredential.vue";

import { createRouteRecords } from "./route-permissions";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: AppLayout,
    children: createRouteRecords()
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
      },
      {
        path: "mobile-debug",
        component: MobileDebug
      }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes
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
  if (runtimeStore.issueDebugCredentials) {
    publicPages.push("/mobile-debug");
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

  if (store.user && store.user.permissions.length > 0 && to.meta?.requires) {
    const requirement = to.meta.requires as RouteRequirement;
    if (!store.canAccessRoute(requirement.action, requirement.resource)) {
      return "/";
    }
  }
});

export default router;
