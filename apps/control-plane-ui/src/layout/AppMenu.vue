<script setup lang="ts">
import { ref } from "vue";

import AppMenuItem from "./AppMenuItem.vue";
import { useDspStore } from "../stores/dsp";
import { storeToRefs } from "pinia";

const { negotiationsCount, ctaTransfersCount } = storeToRefs(useDspStore());

const model = ref([
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
        badge: negotiationsCount,
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
