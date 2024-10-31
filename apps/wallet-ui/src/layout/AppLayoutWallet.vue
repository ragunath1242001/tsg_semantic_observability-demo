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
      }
    ]
  },
  {
    label: "DID",
    items: [
      {
        label: "Services",
        icon: "pi pi-fw pi-code",
        to: "/services"
      },
      {
        label: "Key management",
        icon: "pi pi-fw pi-key",
        to: "/keys"
      },
      {
        label: "Signature",
        icon: "pi pi-fw pi-verified",
        to: "/signature"
      }
    ]
  },
  {
    label: "Credentials",
    items: [
      {
        label: "Overview",
        icon: "pi pi-fw pi-home",
        to: "/credentials"
      },
      {
        label: "Import plain credential",
        icon: "pi pi-fw pi-file-import",
        to: "/credentials/import"
      },
      ...(runtimeStore.gaiaXSupport
        ? [
            {
              label: "Gaia-X Credentials",
              icon: "pi pi-fw pi-verified",
              to: "/credentials/gaiax"
            }
          ]
        : [])
    ]
  },
  {
    label: "Issuance",
    items: [
      {
        label: "Manual issuance",
        icon: "pi pi-fw pi-pencil",
        to: "/credentials/issue"
      },
      {
        label: "OpenID 4 VCI",
        icon: "pi pi-fw pi-refresh",
        to: "/credentials/oid4vci"
      }
    ]
  },
  {
    label: "Presentation",
    items: [
      {
        label: "Manual presentation request",
        icon: "pi pi-fw pi-wrench",
        to: "/presentation"
      }
    ]
  },
  {
    label: "Contexts",
    items: [
      {
        label: "JSON-LD Contexts",
        icon: "pi pi-fw pi-search-plus",
        to: "/contexts"
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
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout
      :topbar="{
        title: 'Wallet',
        name: runtimeStore.title ?? '',
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
