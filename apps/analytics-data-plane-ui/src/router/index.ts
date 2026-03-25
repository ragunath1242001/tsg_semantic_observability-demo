import { RouteRequirement } from "@tsg-dsp/common-ui/router/route-permissions";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { createRouter, createWebHashHistory } from "vue-router";

import AppLayout from "@/layout/AppLayoutAnalyticsDataPlane.vue";

import { useRuntimeStore } from "../stores/runtime";
import LoginVue from "../views/Login.vue";
import { createRouteRecords } from "./route-permissions";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: createRouteRecords()
    },
    {
      path: "/login",
      name: "login",
      component: LoginVue
    }
  ],
  scrollBehavior(_to, _from, _savedPosition) {
    return { top: 0 };
  }
});
router.beforeEach(async (to) => {
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ["/login"];
  const store = useUserStore();
  await store.loaded;
  const authRequired = !publicPages.includes(to.path);
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

  if (to.path === "/login") return;

  const runtimeStore = useRuntimeStore();
  await runtimeStore.ensureLoaded();

  if (to.meta?.restrictedInClientMode && runtimeStore.isClientMode) return "/";
  if (to.meta?.restrictedInServerMode && runtimeStore.isServerMode) return "/";
  if (to.meta?.restrictedInStandaloneMode && runtimeStore.isStandaloneMode)
    return "/";
});

export default router;
