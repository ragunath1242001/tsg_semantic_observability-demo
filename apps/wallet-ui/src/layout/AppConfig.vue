<script setup lang="ts">
import Drawer from "primevue/drawer";
import { ref } from "vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { useToast } from "primevue/usetoast";
import { useRuntimeStore } from "../stores/runtime";
import { toastError } from "@tsg-dsp/common-ui/utils/error";

const { configSidebarVisible } = useLayout();

const visible = ref(configSidebarVisible);

const toast = useToast();
const runtimeStore = useRuntimeStore();

const updateSettings = async () => {
  try {
    await runtimeStore.updateRuntimeSettings();
  } catch (error) {
    toast.add(toastError({
      error,
      summary: "Failed to update settings",
      defaultMessage: `Could not update runtime settings`
    }));
  }
};
</script>

<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-[26rem]"
  >
    <div class="text-xl mt-2">Gaia-X Support</div>
    <ToggleSwitch v-model="runtimeStore.gaiaXSupport" @change="updateSettings" />
  </Drawer>
</template>

<style lang="scss" scoped></style>
