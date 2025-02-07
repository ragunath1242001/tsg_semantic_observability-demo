import { createRouter, createWebHashHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
// import LoginVue from '../views/Login.vue'
import { useUserStore } from "../stores/user.js";
import Dashboard from "../views/Dashboard.vue";

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
        }
      ]
    }
    // {
    //   path: '/login',
    //   name: 'login',
    //   component: LoginVue
    // }
  ]
});
// router.beforeEach(async (to) => {
//   // redirect to login page if not logged in and trying to access a restricted page
//   const publicPages = ['/login']
//   const store = useUserStore()
//   const authRequired = !publicPages.includes(to.path)
//   if (authRequired && !store.user) {
//     store.returnUrl = to.fullPath
//     return '/login'
//   }
// })
export default router;
