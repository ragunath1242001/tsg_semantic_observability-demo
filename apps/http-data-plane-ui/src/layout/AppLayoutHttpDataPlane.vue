<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import AppConfig from "./AppConfig.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed, onMounted } from "vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { useCatalogStore } from "../stores/catalog";

const { layoutConfig, layoutState } = useLayout();

const userStore = useUserStore();
const catalogStore = useCatalogStore();

const baseLogoUrl = "layout/images";
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
        icon: "pi pi-fw pi-id-card",
        to: "/"
      },
      {
        label: "Metadata",
        icon: "pi pi-fw pi-file",
        to: "/metadata"
      },
      {
        label: "Logging",
        icon: "pi pi-fw pi-list",
        to: "/logging"
      },
      {
        label: "Tester",
        icon: "pi pi-fw pi-cog",
        to: "/tester"
      }
    ]
  }
];

const footer: FooterProps = {
  baseLogoUrl: baseLogoUrl,
  footerText: "TNO"
};

const route = useRoute();

const sidebar: MenuProps = {
  menu: menuList,
  route: route
};

onMounted(async () => {
  await catalogStore.getOwnCatalog();
});
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout
      :topbar="{
        title: 'Http Data Plane',
        name: catalogStore.title,
        baseLogoUrl: baseLogoUrl,
        user: userStore.user,
        router: useRouter()
      }"
      :footer="footer"
      :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
