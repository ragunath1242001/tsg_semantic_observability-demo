<script setup lang="ts">
import BaseAppConfig from "@tsg-dsp/common-ui/layout/BaseAppConfig.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

import { useRuntimeStore } from "../stores/runtime";

const { configSidebarVisible } = useLayout();

const runtimeStore = useRuntimeStore();

const toast = useToast();

const visible = ref(configSidebarVisible);

const contractNegotiationValues = ref([
  { name: "Automatic", value: "automatic" },
  { name: "Semi-Manual", value: "semi-manual" },
  { name: "Manual", value: "manual" }
]);

const updateSettings = async () => {
  await runtimeStore.updateRuntimeSettings();
  visible.value = false;
};
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :transition-options="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-[26rem]">
    <div class="text-xl mt-2">Contract Negotiation</div>
    <SelectButton
      v-model="runtimeStore.controlPlaneInteractions"
      :options="contractNegotiationValues"
      option-label="name"
      option-value="value"
      data-key="value" />
    <BaseAppConfig
      v-model:color="runtimeStore.color"
      v-model:dark-theme-url="runtimeStore.darkThemeUrl"
      v-model:light-theme-url="runtimeStore.lightThemeUrl"
      :runtime-store="runtimeStore"
      :toast="toast" />
    <Button label="Save Settings" class="mt-4" @click="updateSettings" />
  </Drawer>
</template>

<style lang="scss" scoped></style>
