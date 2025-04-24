import { createRouter, createWebHashHistory } from "vue-router";

import AppLayout from "@/layout/AppLayout.vue";

import { useAuthStore } from "../stores/user.js";
import Dashboard from "../views/Dashboard.vue";
import LoginVue from "../views/Login.vue";

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
          path: "/clients",
          name: "clients",
          component: () => import("../views/Clients.vue")
        },
        {
          path: "/users",
          name: "users",
          component: () => import("../views/Users.vue")
        },
        {
          path: "/roles",
          name: "roles",
          component: () => import("../views/Roles.vue")
        }
      ]
    },
    {
      path: "/login",
      name: "login",
      component: LoginVue
    },
    {
      path: "/authorize",
      name: "authorize",
      component: LoginVue
    }
  ]
});
router.beforeEach(async (to) => {
  // redirect to login page if not logged in and trying to access a restricted page
  const publicPages = ["/login", "/authorize"];
  const store = useAuthStore();
  const authRequired = !publicPages.includes(to.path);
  while (store.user === null) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (authRequired && !store.user) {
    store.returnUrl = to.fullPath;
    return "/login";
  }
});
export default router;
