<script setup lang="ts">
import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import AppConfig from "./AppConfig.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { useRoute, useRouter } from "vue-router";
import { useRuntimeStore } from "../stores/runtime";

const { layoutConfig, layoutState } = useLayout();
const runtimeStore = useRuntimeStore();
runtimeStore.getRuntimeSettings();

const { negotiationsCount, ownCatalog } = storeToRefs(useDspStore());

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

const menuList: Menu[] = [
  {
    label: "Home",
    items: [
      {
        label: "Dashboard",
        icon: "pi pi-fw pi-home",
        to: "/"
      },
      {
        label: "Own Catalog",
        icon: "pi pi-fw pi-warehouse",
        to: "/catalog"
      }
    ]
  },
  {
    label: "Dataspace Protocol",
    items: [
      {
        label: "Catalog Request",
        icon: "pi pi-fw pi-book",
        to: "/catalog/request"
      },
      {
        label: "Negotiations",
        icon: "pi pi-fw pi-comments",
        to: "/negotiations",
        badge: negotiationsCount
      },
      {
        label: "Transfers",
        icon: "pi pi-fw pi-arrow-right-arrow-left",
        to: "/transfers"
      }
    ]
  },
  {
    label: "Dataplanes",
    items: [
      {
        label: "Dataplanes",
        icon: "pi pi-fw pi-database",
        to: "/dataplanes"
      }
    ]
  },
  {
    label: "Registry",
    items: [
      {
        label: "Registry",
        icon: "pi pi-fw pi-address-book",
        to: "/registry"
      }
    ]
  }
];

const footer: FooterProps = {
  logoUrl: logoUrl.value,
  footerText: "TNO"
};

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
        title: 'Control Plane',
        name: ownCatalog.title,
        logoUrl: logoUrl,
        router: useRouter()
      }"
      :footer="footer"
      :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
