import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import DidView from '../views/DidView.vue'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'did',
    component: DidView
  },
  {
    path: '/keys',
    name: 'keys',
    component: () => import(/* webpackChunkName: "keys" */ '../views/KeysView.vue')
  },
  {
    path: '/credentials',
    name: 'credentials',
    component: () => import(/* webpackChunkName: "credentials" */ '../views/CredentialsView.vue')
  },
  {
    path: '/clients',
    name: 'clients',
    component: () => import(/* webpackChunkName: "clients" */ '../views/ClientsView.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
