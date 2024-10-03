import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayoutControlPlane.vue";
import DashboardVue from "../views/Dashboard.vue";
import CatalogVue from "../views/Catalog.vue";
import LoginVue from "../views/Login.vue";
import NegotiationsVue from "../views/Negotiations.vue";
import TransfersVue from "../views/Transfers.vue";
import DataplaneVue from "../views/Dataplane.vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import Registry from "../views/Registry.vue";

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
          path: "/catalog/request",
          name: "catalogrequest",
          component: CatalogVue,
        },
        {
          path: "/negotiations",
          name: "negotiations",
          component: NegotiationsVue,
        },
        {
          path: "/transfers",
          name: "transfers",
          component: TransfersVue,
        },
        {
          path: "/dataplanes",
          name: "dataplanes",
          component: DataplaneVue,
        },
        {
          path: "/registry",
          name: "registry",
          component: Registry,
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
  const store = useUserStore();
  const authRequired = !publicPages.includes(to.path);
  if (authRequired && !store.user) {
    store.returnUrl = to.fullPath;
    return "/login";
  }
});
export default router;
