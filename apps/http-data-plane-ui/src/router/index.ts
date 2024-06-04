import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import LoginVue from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";
import Tester from "../views/Tester.vue";
import { store } from "../store/index.js";
import Logging from "../views/Logging.vue";
import Metadata from "../views/Metadata.vue";

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
          component: Dashboard,
        },
        {
          path: "/tester/:id",
          name: "tester",
          component: Tester,
          props: {
            default: true,
          },
        },
        {
          path: "/metadata",
          name: "metadata",
          component: Metadata,
        },
        {
          path: "/logging",
          name: "logging",
          component: Logging,
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: LoginVue,
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 };
  },
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
