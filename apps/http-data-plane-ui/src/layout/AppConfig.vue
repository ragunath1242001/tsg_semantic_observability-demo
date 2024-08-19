<script setup lang="ts">
import Drawer from "primevue/drawer";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { ref } from "vue";

const { configSidebarVisible } = useLayout();

const visible = ref(configSidebarVisible);
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-[26rem]"
  >
    <p>No Settings yet.</p>
  </Drawer>
</template>

<style lang="scss" scoped></style>
