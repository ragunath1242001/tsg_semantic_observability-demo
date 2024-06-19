<script setup lang="ts">
import { ref, toRef } from "vue";

import AppMenuItem from "./AppMenuItem.vue";

interface MenuItem {
  label: string;
  icon: string;
  to: string;
  badge?: number;
}

export interface Menu {
    label: string;
    items: MenuItem[];
}

export interface MenuProps {
  menu: Menu[];
}

const props = defineProps<MenuProps>();

const model = toRef(props.menu);
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item">
      <app-menu-item :item="item" :index="i"></app-menu-item>
    </template>
  </ul>
</template>

<style lang="scss" scoped></style>
