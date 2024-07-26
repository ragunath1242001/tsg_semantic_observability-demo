<script setup lang="ts">
import Sidebar from "primevue/sidebar";

import { onMounted, ref } from "vue";
import { useLayout } from "@libs/common-ui/layout/composables/layout";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";
import UIConfig from "@libs/common-ui/layout/UIConfig.vue";

const { layoutState } = useLayout();

const http = injectStrict(AxiosKey);

interface RuntimeConfig {
  controlPlaneInteractions: "automatic" | "semi-manual" | "manual";
}

var settings = { controlPlaneInteractions: "" };

const toast = useToast();

const controlPlaneInteractions = ref({ name: "", value: "" });

const visible = layoutState.configMenuActive;

const contractNegotiationValues = ref([
  { name: "Automatic", value: "automatic" },
  { name: "Semi-Manual", value: "semi-manual" },
  { name: "Manual", value: "manual" },
]);

const updateSettings = async () => {
  settings.controlPlaneInteractions = controlPlaneInteractions.value.value;
  try {
    settings = (await http.post("settings/update", settings)).data;
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to update settings",
      detail: `${e.response ? e.response.data.message : e}`,
      life: 3000,
    });
  }
};
const initialize = async () => {
  const resp = await http.get("settings");
  settings = resp.data as RuntimeConfig;
  controlPlaneInteractions.value = contractNegotiationValues.value.find(
    (c) => c.value === settings.controlPlaneInteractions
  );
};

onMounted(async () => await initialize());
</script>

<template>
  <Sidebar
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-26rem"
  >
    <UIConfig :primevueInstance="$primevue" />
    <h5>Contract Negotiation</h5>
    <SelectButton
      v-model="controlPlaneInteractions"
      v-on:change="updateSettings"
      :options="contractNegotiationValues"
      optionLabel="name"
    />
  </Sidebar>
</template>

<style lang="scss" scoped></style>
