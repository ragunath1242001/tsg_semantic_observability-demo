<script setup lang="ts">
import { computed, ref } from "vue";

import AppMenuItem from "./AppMenuItem.vue";
import { store } from "../store";

const model = computed(() => {
  return [
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
        to: "/services"
      },
      {
        label: "Key management",
        icon: "pi pi-fw pi-key",
        to: "/keys",
      },
    ]
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
      ...(store.state.settings?.gaiaXSupport ? [{
        label: "Gaia-X Credentials",
        icon: "pi pi-fw pi-verified",
        to: "/credentials/gaiax",
      }] : [])
      ,
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
  },
]
})

</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item">
      <app-menu-item :item="item" :index="i"></app-menu-item>
    </template>
  </ul>
</template>

<style lang="scss" scoped></style>
