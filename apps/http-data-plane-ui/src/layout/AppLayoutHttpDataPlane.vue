<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import AppConfig from "./AppConfig.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { TopbarProps } from "@tsg-dsp/common-ui/layout/AppTopbar.vue";
import { useRoute, useRouter } from "vue-router";
import { store } from "../store/index.js";

const { layoutConfig, layoutState } = useLayout();

const user = store.state.user;

const baseLogoUrl = "layout/images";
const containerClass = computed(() => {
  return {
    "layout-overlay": layoutConfig.menuMode === "overlay",
    "layout-static": layoutConfig.menuMode === "static",
    "layout-static-inactive":
      layoutState.staticMenuDesktopInactive &&
      layoutConfig.menuMode === "static",
    "layout-overlay-active": layoutState.overlayMenuActive,
    "layout-mobile-active": layoutState.staticMenuMobileActive,
  };
});
const menuList: Menu[] = [
  {
    label: "Home",
    items: [
      {
        label: "Dashboard",
        icon: "pi pi-fw pi-id-card",
        to: "/",
      },
      {
        label: "Metadata",
        icon: "pi pi-fw pi-file",
        to: "/metadata",
      },
      {
        label: "Logging",
        icon: "pi pi-fw pi-list",
        to: "/logging",
      },
    ],
  },
];

const topbar: TopbarProps = {
  title: "Http Data Plane",
  name: store.state.title,
  baseLogoUrl: baseLogoUrl,
  user: user,
  router: useRouter(),
};

const footer: FooterProps = {
  baseLogoUrl: baseLogoUrl,
  footerText: "TNO",
};

const route = useRoute();

const sidebar: MenuProps = {
  menu: menuList,
  route: route,
};
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout :topbar="topbar" :footer="footer" :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
