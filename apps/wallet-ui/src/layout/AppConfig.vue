<script setup lang="ts">
import BaseAppConfig from "@tsg-dsp/common-ui/layout/BaseAppConfig.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { toastError } from "@tsg-dsp/common-ui/utils/error";
import Drawer from "primevue/drawer";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

import { useRuntimeStore } from "../stores/runtime";

const { configSidebarVisible } = useLayout();

const visible = ref(configSidebarVisible);

const toast = useToast();
const runtimeStore = useRuntimeStore();

const updateSettings = async () => {
  try {
    await runtimeStore.updateRuntimeSettings();
  } catch (error) {
    toast.add(
      toastError({
        error,
        summary: "Failed to update settings",
        defaultMessage: `Could not update runtime settings`
      })
    );
  }
  visible.value = false;
};
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :transition-options="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-[26rem]">
    <div class="text-xl mt-2">Gaia-X Support</div>
    <ToggleSwitch v-model="runtimeStore.gaiaXSupport" />
    <BaseAppConfig
      v-model:color="runtimeStore.color"
      v-model:dark-theme-url="runtimeStore.darkThemeUrl"
      v-model:light-theme-url="runtimeStore.lightThemeUrl"
      :runtime-store="runtimeStore" />
    <Button label="Save Settings" class="mt-4" @click="updateSettings" />
  </Drawer>
</template>

<style lang="scss" scoped></style>
