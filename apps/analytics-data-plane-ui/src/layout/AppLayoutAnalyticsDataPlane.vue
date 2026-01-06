<script setup lang="ts">
import AppLayout from "@tsg-dsp/common-ui/layout/AppLayout.vue";
import { Menu, MenuProps } from "@tsg-dsp/common-ui/layout/AppMenu.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useCatalogStore } from "../stores/catalog";
import { useRuntimeStore } from "../stores/runtime";
import AppConfig from "./AppConfig.vue";

const { layoutConfig, layoutState } = useLayout();

const runtimeStore = useRuntimeStore();
runtimeStore.getRuntimeSettings();

const catalogStore = useCatalogStore();

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
const menuList = computed<Menu[]>(() => {
  const menus: Menu[] = [
    {
      label: "Home",
      items: [
        {
          label: "Dashboard",
          icon: "pi pi-fw pi-id-card",
          to: "/"
        },
        ...(runtimeStore.isClientMode
          ? []
          : [
              {
                label: "Metadata",
                icon: "pi pi-fw pi-file",
                to: "/metadata"
              }
            ])
      ]
    }
  ];

  if (!runtimeStore.isServerMode) {
    menus.push({
      label: "Files",
      items: [
        {
          label: "Files",
          icon: "pi pi-fw pi-folder-open",
          to: "/files"
        }
      ]
    });
  }

  menus.push({
    label: "Algorithms",
    items: runtimeStore.isClientMode
      ? [
          {
            label: "Instances",
            icon: "pi pi-fw pi-chart-line",
            to: "/algorithms/instances"
          }
        ]
      : [
          {
            label: "Create instance",
            icon: "pi pi-fw pi-sparkles",
            to: "/algorithms/create-instance"
          },
          {
            label: "Instances",
            icon: "pi pi-fw pi-chart-line",
            to: "/algorithms/instances"
          }
        ]
  });

  if (!runtimeStore.isClientMode) {
    menus.push({
      label: "Collaboration",
      items: [
        {
          label: "Project Agreements",
          icon: "pi pi-fw pi-file-edit",
          to: "/project-agreements"
        }
      ]
    });
  }

  return menus;
});

const route = useRoute();

const sidebar = computed<MenuProps>(() => ({
  menu: menuList.value,
  route: route
}));

onMounted(async () => {
  await catalogStore.getOwnCatalog();
});
</script>
<template>
  <div class="layout-wrapper" :class="containerClass">
    <AppLayout
      :topbar="{
        title: 'Analytics Data Plane',
        name: catalogStore.title,
        logoUrl: logoUrl,
        router: useRouter()
      }"
      :footer="{
        logoUrl: logoUrl,
        footerText: 'TNO'
      }"
      :sidebar="sidebar" />
    <AppConfig />
    <div class="layout-mask animate-fadein"></div>
  </div>
</template>
