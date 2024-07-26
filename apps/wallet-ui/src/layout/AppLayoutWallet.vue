<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import AppConfig from "./AppConfig.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { TopbarProps } from "@tsg-dsp/common-ui/layout/AppTopbar.vue";
import { useRouter, useRoute } from "vue-router";
import { store } from "../store/index.js";

const { layoutConfig, layoutState } = useLayout();

const user = store.state.user;

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
    items: [
      {
        label: "Dashboard",
        icon: "pi pi-fw pi-id-card",
        to: "/",
      },
    ],
  },
  {
    label: "DID",
    items: [
      {
        label: "Services",
        icon: "pi pi-fw pi-code",
        to: "/services",
      },
      {
        label: "Key management",
        icon: "pi pi-fw pi-key",
        to: "/keys",
      },
    ],
  },
  {
    label: "Credentials",
    items: [
      {
        label: "Overview",
        icon: "pi pi-fw pi-home",
        to: "/credentials",
      },
      {
        label: "Import plain credential",
        icon: "pi pi-fw pi-file-import",
        to: "/credentials/import",
      },
      ...(store.state.settings?.gaiaXSupport
        ? [
            {
              label: "Gaia-X Credentials",
              icon: "pi pi-fw pi-verified",
              to: "/credentials/gaiax",
            },
          ]
        : []),
    ],
  },
  {
    label: "Issuance",
    items: [
      {
        label: "Manual issuance",
        icon: "pi pi-fw pi-pencil",
        to: "/credentials/issue",
      },
      {
        label: "OpenID 4 VCI",
        icon: "pi pi-fw pi-refresh",
        to: "/credentials/oid4vci",
      },
    ],
  },
  {
    label: "Presentation",
    items: [
      {
        label: "Manual presentation request",
        icon: "pi pi-fw pi-wrench",
        to: "/presentation",
      },
    ],
  },
  {
    label: "Contexts",
    items: [
      {
        label: "JSON-LD Contexts",
        icon: "pi pi-fw pi-search-plus",
        to: "/contexts",
      },
    ],
  },
];

const topbar: TopbarProps = {
  title: "Wallet",
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
  </div>
</template>
