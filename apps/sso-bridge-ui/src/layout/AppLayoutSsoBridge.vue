<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/user";

const { layoutConfig, layoutState } = useLayout();
const authStore = useAuthStore();

const logoUrl = computed(() => {
  return `/layout/images/${layoutConfig.darkTheme ? "logo-white" : "logo-dark"}.svg`;
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

const isAdmin = computed(() => {
  if (!authStore.user || typeof authStore.user === "boolean") return false;
  return authStore.user.roles?.includes("ssobridge_admin") || false;
});

const menuList = computed(() => {
  const menu = [
    {
      label: "Home",
      items: [{ label: "Dashboard", icon: "pi pi-fw pi-home", to: "/" }]
    },
    {
      label: "Account",
      items: [{ label: "Profile", icon: "pi pi-fw pi-user", to: "/profile" }]
    }
  ];

  menu.push();
  // Only show management section to admins
  if (isAdmin.value) {
    menu.push({
      label: "Management",
      items: [
        { label: "Clients", icon: "pi pi-fw pi-desktop", to: "/clients" },
        { label: "Users", icon: "pi pi-fw pi-users", to: "/users" },
        { label: "Roles", icon: "pi pi-fw pi-id-card", to: "/roles" }
      ]
    });
  }

  return menu;
});

const route = useRoute();

const sidebar = computed<MenuProps>(() => ({
  menu: menuList.value,
  route: route
}));
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout
      :topbar="{
        title: 'SSO Bridge',
        name: 'Oauth Server',
        logoUrl: logoUrl,
        router: useRouter(),
        showSettings: false
      }"
      :footer="{
        logoUrl: logoUrl,
        footerText: 'TNO'
      }"
      :sidebar="sidebar" />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
