import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { createRouter, createWebHashHistory } from "vue-router";

import AppLayout from "@/layout/AppLayoutAnalyticsDataPlane.vue";

import { useRuntimeStore } from "../stores/runtime";
import Dashboard from "../views/Dashboard.vue";
import Files from "../views/Files.vue";
import AlgorithmInstances from "../views/instances/AlgorithmInstances.vue";
import CreateAlgorithmInstance from "../views/instances/CreateAlgorithmInstance.vue";
import InstanceDetails from "../views/instances/InstanceDetails.vue";
import LoginVue from "../views/Login.vue";
import Metadata from "../views/Metadata.vue";
import ProjectAgreements from "../views/ProjectAgreements.vue";
import ConsumerView from "../views/transfers/ConsumerView.vue";
import ProviderView from "../views/transfers/ProviderView.vue";

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
          component: Dashboard
        },
        {
          path: "/metadata",
          name: "metadata",
          component: Metadata
        },
        {
          path: "/files",
          component: Files
        },
        {
          path: "/algorithms/instances",
          name: "algorithm-instances",
          component: AlgorithmInstances
        },
        {
          path: "/algorithms/create-instance",
          component: CreateAlgorithmInstance
        },
        {
          path: "/algorithms/instances/:id",
          name: "algorithm-instance-details",
          component: InstanceDetails
        },
        {
          path: "/project-agreements",
          name: "project-agreements",
          component: ProjectAgreements
        },
        {
          path: "/provider/:id",
          name: "provider",
          component: ProviderView
        },
        {
          path: "/consumer/:id",
          name: "consumer",
          component: ConsumerView
        }
      ]
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

  if (to.path === "/login") return;

  const runtimeStore = useRuntimeStore();
  await runtimeStore.ensureLoaded();

  // Declarative route restrictions by mode
  // Each pattern is checked - if path matches and condition is true, redirect to home
  const restrictions: Array<{
    pattern: string | ((path: string) => boolean);
    restrictedIn: "client" | "server";
  }> = [
    // Client mode restrictions
    { pattern: "/algorithms/create-instance", restrictedIn: "client" },
    { pattern: "/project-agreements", restrictedIn: "client" },
    { pattern: "/metadata", restrictedIn: "client" },
    {
      pattern: (path) =>
        path.startsWith("/provider/") || path.startsWith("/consumer/"),
      restrictedIn: "client"
    },
    // Server mode restrictions
    { pattern: "/files", restrictedIn: "server" }
  ];

  const isRestricted = restrictions.some((restriction) => {
    const pathMatches =
      typeof restriction.pattern === "string"
        ? to.path.startsWith(restriction.pattern)
        : restriction.pattern(to.path);

    const modeMatches =
      (restriction.restrictedIn === "client" && runtimeStore.isClientMode) ||
      (restriction.restrictedIn === "server" && runtimeStore.isServerMode);

    return pathMatches && modeMatches;
  });

  if (isRestricted) {
    return "/";
  }
});

export default router;
