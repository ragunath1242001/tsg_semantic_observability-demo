<script setup lang="ts">
import AppMenu, { MenuProps } from "./AppMenu.vue";
const props = defineProps<MenuProps>();
</script>

<template>
  <app-menu :menu="props.menu" :route="route"></app-menu>
</template>

<style lang="scss" scoped></style>
