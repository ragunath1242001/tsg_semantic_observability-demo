import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import LoginVue from "../views/Login.vue";
import DashboardVue from "../views/Dashboard.vue";
import TesterVue from "../views/Tester.vue";
import { store } from "../store/index.js";

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
          path: "/tester",
          name: "tester",
          component: TesterVue,
          props: {
            default: true,
          },
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
  if (authRequired && !store.state.user) {
    return "/login";
  }
});
export default router;
