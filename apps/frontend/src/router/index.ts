import { createRouter, createWebHashHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import DashboardVue from '../views/Dashboard.vue';
import CatalogVue from '../views/Catalog.vue';
import LoginVue from '../views/Login.vue';
import NegotiationsVue from '../views/Negotiations.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: DashboardVue
                },
                {
                    path: '/catalog/request',
                    name: 'catalogrequest',
                    component: CatalogVue
                },
                {
                    path: '/negotiations',
                    name: 'negotiations',
                    component: NegotiationsVue
                }

            ]
        },
        {
            path: '/login',
            name: 'login',
            component: LoginVue
        }

    ]
});
router.beforeEach(async (to) => {
    // redirect to login page if not logged in and trying to access a restricted page
    const publicPages = ['/login'];
    const authRequired = !publicPages.includes(to.path);

    if (authRequired && (!localStorage.getItem("username") || !localStorage.getItem("password"))) {
        return '/login';
    }
});
export default router;
