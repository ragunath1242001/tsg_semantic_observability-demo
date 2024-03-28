<script setup lang="ts">
import { ref } from "vue";

import AppMenuItem from "./AppMenuItem.vue";

const model = ref([
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
    label: "Keys",
    items: [
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
        label: "Issue",
        icon: "pi pi-fw pi-pencil",
        to: "/credentials/issue",
      },
      {
        label: "Import",
        icon: "pi pi-fw pi-file-import",
        to: "/credentials/import",
      },
      {
        label: "Gaia-X",
        icon: "pi pi-fw pi-verified",
        to: "/credentials/gaiax",
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
        label: "Manual invocation",
        icon: "pi pi-fw pi-wrench",
        to: "/presentation"
      }
    ]
  },
  {
    label: "Clients",
    items: [
      {
        label: "Client management",
        icon: "pi pi-fw pi-cog",
        to: "/clients",
      },
    ],
  },
]);
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item">
      <app-menu-item :item="item" :index="i"></app-menu-item>
    </template>
  </ul>
</template>

<style lang="scss" scoped></style>
