<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const { layoutConfig, layoutState } = useLayout();

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

const menuList = [
  {
    label: "Home",
    items: [{ label: "Dashboard", icon: "pi pi-fw pi-home", to: "/" }]
  },
  {
    label: "Management",
    items: [
      { label: "Clients", icon: "pi pi-fw pi-desktop", to: "/clients" },
      { label: "Users", icon: "pi pi-fw pi-users", to: "/users" },
      { label: "Roles", icon: "pi pi-fw pi-id-card", to: "/roles" }
    ]
  }
];

const route = useRoute();

const sidebar: MenuProps = {
  menu: menuList,
  route: route
};
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
