import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { createRouter, createWebHashHistory } from "vue-router";

import AppLayout from "@/layout/AppLayoutAnalyticsDataPlane.vue";

import Dashboard from "../views/Dashboard.vue";
import Files from "../views/Files.vue";
import FilesUpload from "../views/FilesUpload.vue";
import AlgorithmInstances from "../views/instances/AlgorithmInstances.vue";
import CreateAlgorithmInstance from "../views/instances/CreateAlgorithmInstance.vue";
import InstanceDetails from "../views/instances/InstanceDetails.vue";
import JobDebug from "../views/JobDebug.vue";
import Logging from "../views/Logging.vue";
import LoginVue from "../views/Login.vue";
import Metadata from "../views/Metadata.vue";
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
          path: "/logging",
          name: "logging",
          component: Logging
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
          component: InstanceDetails,
          props: true
        },
        {
          path: "/jobdebug",
          name: "job-debug",
          component: JobDebug
        },
        {
          path: "/files/upload",
          name: "fileUpload",
          component: FilesUpload
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
});

export default router;
