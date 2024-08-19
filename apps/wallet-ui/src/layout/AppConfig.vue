<script setup lang="ts">
import Drawer from "primevue/drawer";
import { ref } from "vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { useToast } from "primevue/usetoast";
import { store } from "../store";

const { configSidebarVisible } = useLayout();

const visible = ref(configSidebarVisible);

const toast = useToast();
const config = ref(store.state.settings);

const updateSettings = async () => {
  try {
    await store.dispatch("updateSettings", config.value);
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to update settings",
      detail: `${e.response ? e.response.data.message : e}`,
      life: 3000,
    });
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
    <ToggleSwitch v-model="config.gaiaXSupport" @change="updateSettings" />
  </Drawer>
</template>

<style lang="scss" scoped></style>
