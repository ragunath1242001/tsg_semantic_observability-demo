<script setup lang="ts">
import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import AppConfig from "./AppConfig.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { TopbarProps } from "@tsg-dsp/common-ui/layout/AppTopbar.vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "../stores/user";

const { layoutConfig, layoutState } = useLayout();

const { negotiationsCount, ownCatalog } = storeToRefs(useDspStore());

const { user } = storeToRefs(useUserStore());

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
  name: ownCatalog.value.title,
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
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
