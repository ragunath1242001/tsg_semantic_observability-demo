<script setup lang="ts">
import { Action, Resource } from "@tsg-dsp/common-dtos";
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { generateMenuFromRoutes } from "../router/route-permissions";
import { useCatalogStore } from "../stores/catalog";
import { useRuntimeStore } from "../stores/runtime";
import AppConfig from "./AppConfig.vue";

const { layoutConfig, layoutState } = useLayout();

const runtimeStore = useRuntimeStore();
runtimeStore.getRuntimeSettings();

const catalogStore = useCatalogStore();
const userStore = useUserStore();

const canManageSettings = computed(() =>
  userStore.canAccessRoute(Action.UPDATE, Resource.ADP_CONFIG)
);

const logoUrl = computed(() => {
  if (layoutConfig.darkTheme && runtimeStore.darkThemeUrl) {
    return runtimeStore.darkThemeUrl;
  } else if (!layoutConfig.darkTheme && runtimeStore.lightThemeUrl) {
    return runtimeStore.lightThemeUrl;
  }
  return `layout/images/${
    layoutConfig.darkTheme ? "logo-white" : "logo-dark"
  }.svg`;
});
const containerClass = computed(() => {
  return {
    "layout-overlay": layoutConfig.menuMode === "overlay",
    "layout-static": layoutConfig.menuMode === "static",
    "layout-static-inactive":
      layoutState.staticMenuDesktopInactive &&
      layoutConfig.menuMode === "static",
    "layout-overlay-active": layoutState.overlayMenuActive,
    "layout-mobile-active": layoutState.staticMenuMobileActive
  };
});
// Generate menu dynamically from route configuration, filtered by user permissions and runtime mode
const menuList = computed<Menu[]>(
  () =>
    generateMenuFromRoutes(
      userStore.user?.permissions ?? [],
      runtimeStore
    ) as Menu[]
);

const route = useRoute();

const sidebar = computed<MenuProps>(() => ({
  menu: menuList.value,
  route: route
}));

onMounted(async () => {
  await catalogStore.getOwnCatalog();
});
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout
      :topbar="{
        title: 'Analytics Data Plane',
        name: catalogStore.title,
        logoUrl: logoUrl,
        router: useRouter(),
        showSettings: canManageSettings
      }"
      :footer="{
        logoUrl: logoUrl,
        footerText: 'TNO'
      }"
      :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
