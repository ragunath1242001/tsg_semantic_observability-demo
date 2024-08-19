<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import { injectStrict } from "../utils/injectTyped";
import { AxiosKey } from "../utils/symbols";
import { useToast } from "primevue/usetoast";

const { configSidebarVisible } = useLayout();

const http = injectStrict(AxiosKey);

interface RuntimeConfig {
  controlPlaneInteractions: "automatic" | "semi-manual" | "manual";
}

var settings = { controlPlaneInteractions: "" };

const toast = useToast();

const controlPlaneInteractions = ref({ name: "", value: "" });

const visible = ref(configSidebarVisible);

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
  <Drawer
    v-model:visible="visible"
    position="right"
    :transitionOptions="'.3s cubic-bezier(0, 0, 0.2, 1)'"
    class="layout-config-sidebar w-[26rem]"
  >
    <div class="text-xl mt-2">Contract Negotiation</div>
    <SelectButton
      v-model="controlPlaneInteractions"
      v-on:change="updateSettings"
      :options="contractNegotiationValues"
      optionLabel="name"
    />
  </Drawer>
</template>

<style lang="scss" scoped></style>
