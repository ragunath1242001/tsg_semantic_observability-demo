<script setup lang="ts">
import Sidebar from "primevue/sidebar";

import { onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useLayout } from "../layout/composables/layout";
import { useToast } from "primevue/usetoast";
import { store } from "../store";

const { layoutState } = useLayout();

const toast = useToast();
const visible = layoutState.configMenuActive;

const config = ref(store.state.settings);

const contractNegotiationValues = ref([
  { name: "Automatic", value: "automatic" },
  { name: "Semi-Manual", value: "semi-manual" },
  { name: "Manual", value: "manual" },
]);

const updateSettings = async () => {
  try {
    await store.dispatch('updateSettings', config.value);
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
  <Sidebar
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-26rem"
  >
    <h5>Gaia-X Support</h5>
    <ToggleButton 
      v-model="config.gaiaXSupport"
      on-label="Enabled"
      off-label="Disabled"
      @change="updateSettings"
      />
  </Sidebar>
</template>

<style lang="scss" scoped></style>
