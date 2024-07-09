<script setup lang="ts">
import Sidebar from "primevue/sidebar";
import { useLayout } from "@libs/common-ui/layout/composables/layout";
import UIConfig from "@libs/common-ui/layout/UIConfig.vue";

const { layoutState } = useLayout();

const visible = layoutState.configMenuActive;
</script>

<template>
  <Sidebar
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-26rem"
  >
    <UIConfig />
  </Sidebar>
</template>

<style lang="scss" scoped></style>
