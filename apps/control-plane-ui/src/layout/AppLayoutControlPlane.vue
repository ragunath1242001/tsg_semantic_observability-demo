<script setup lang="ts">
import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";
import AppLayout from "@libs/common-ui/layout/AppLayout.vue";
import { useLayout } from "@libs/common-ui/layout/composables/layout";
import { computed, watch } from "vue";
import AppConfig from "./AppConfig.vue";
import { Menu, MenuProps } from "@libs/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@libs/common-ui/layout/AppFooter.vue";
import { TopbarProps } from "@libs/common-ui/layout/AppTopbar.vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "../stores/user";
import { usePrimeVue } from "primevue/config";

const { layoutConfig, layoutState } = useLayout();

const Primevue = usePrimeVue();

const theme =
  localStorage.getItem("theme") ??
  ((window?.matchMedia?.("(prefers-color-scheme:dark)")?.matches
    ? "lara-dark-blue"
    : "lara-light-blue") ||
    "lara-dark-blue");

Primevue.changeTheme(layoutConfig.theme.value, theme, "theme-css", () => {
  layoutConfig.theme.value = theme;
  layoutConfig.darkTheme.value = theme === "lara-dark-blue";
});

const { negotiationsCount } = storeToRefs(useDspStore());

const { user } = storeToRefs(useUserStore());

const baseLogoUrl = "layout/images";

const containerClass = computed(() => {
  return {
    "layout-theme-light": !layoutConfig.darkTheme.value,
    "layout-theme-dark": layoutConfig.darkTheme.value,
    "layout-overlay": layoutConfig.menuMode.value === "overlay",
    "layout-static": layoutConfig.menuMode.value === "static",
    "layout-static-inactive":
      layoutState.staticMenuDesktopInactive.value &&
      layoutConfig.menuMode.value === "static",
    "layout-overlay-active": layoutState.overlayMenuActive.value,
    "layout-mobile-active": layoutState.staticMenuMobileActive.value,
    "p-input-filled": layoutConfig.inputStyle.value === "filled",
    "p-ripple-disabled": !layoutConfig.ripple.value,
  };
});

const menuList: Menu[] = [
  {
    label: "Home",
    items: [{ label: "Dashboard", icon: "pi pi-fw pi-home", to: "/" }],
  },
  {
    label: "Dataspace Protocol",
    items: [
      {
        label: "Catalog Request",
        icon: "pi pi-fw pi-book",
        to: "/catalog/request",
      },
      {
        label: "Negotiations",
        icon: "pi pi-fw pi-comments",
        to: "/negotiations",
        badge: negotiationsCount.value,
      },
      {
        label: "Transfers",
        icon: "pi pi-fw pi-arrow-right-arrow-left",
        to: "/transfers",
      },
    ],
  },
  {
    label: "Dataplanes",
    items: [
      {
        label: "Dataplanes",
        icon: "pi pi-fw pi-database",
        to: "/dataplanes",
      },
    ],
  },
  {
    label: "Registry",
    items: [
      {
        label: "Registry",
        icon: "pi pi-fw pi-address-book",
        to: "/registry",
      },
    ],
  },
];

const topbar: TopbarProps = {
  title: "Control Plane",
  baseLogoUrl: baseLogoUrl,
  user: user.value,
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
    <div class="layout-mask"></div>
  </div>
</template>
