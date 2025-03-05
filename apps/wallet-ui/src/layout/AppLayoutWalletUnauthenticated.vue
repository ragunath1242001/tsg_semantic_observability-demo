<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed } from "vue";
import AppConfig from "./AppConfig.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { FooterProps } from "@tsg-dsp/common-ui/layout/AppFooter.vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { useRuntimeStore } from "../stores/runtime";

const { layoutConfig, layoutState } = useLayout();

const userStore = useUserStore();
const runtimeStore = useRuntimeStore();
runtimeStore.getRuntimeSettings();

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
        label: "Overview",
        icon: "pi pi-fw pi-home",
        to: "/"
      },
      {
        label: "Retrieve credential",
        icon: "pi pi-fw pi-id-card",
        to: "/retrieve-credential"
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
        title: 'Wallet',
        name: runtimeStore.title ?? '',
        logoUrl: logoUrl,
        user: userStore.user,
        needSignin: true,
        router: useRouter()
      }"
      :footer="footer"
      :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
