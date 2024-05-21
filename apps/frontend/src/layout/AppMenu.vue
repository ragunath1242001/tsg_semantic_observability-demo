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
    label: "Catalog",
    items: [
      {
        label: "Catalog Request",
        icon: "pi pi-fw pi-book",
        to: "/catalog/request",
      },
    ],
  },
  {
    label: "Negotiations",
    items: [
      {
        label: "Negotiations",
        icon: "pi pi-fw pi-comments",
        to: "/negotiations",
        badge: negotiationsCount,
      },
    ],
  },
  {
    label: "Transfers",
    items: [
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
