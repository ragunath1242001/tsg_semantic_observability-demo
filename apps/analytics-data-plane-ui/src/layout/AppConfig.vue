<script setup lang="ts">
import FormField from "@tsg-dsp/common-ui/components/FormField.vue";
import BaseAppConfig from "@tsg-dsp/common-ui/layout/BaseAppConfig.vue";
import { useLayout } from "@tsg-dsp/common-ui/layout/composables/layout";
import Drawer from "primevue/drawer";
import { useToast } from "primevue/usetoast";
import { ref } from "vue";

import { useRuntimeStore } from "../stores/runtime";

const { configSidebarVisible } = useLayout();

const toast = useToast();
const runtimeStore = useRuntimeStore();

const visible = ref(configSidebarVisible);

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
    <BaseAppConfig
      v-model:color="runtimeStore.color"
      v-model:dark-theme-url="runtimeStore.darkThemeUrl"
      v-model:light-theme-url="runtimeStore.lightThemeUrl"
      :toast="toast"
      :runtime-store="runtimeStore" />

    <template v-if="!runtimeStore.isClientMode">
      <div class="text-xl mt-2">Project Agreements</div>
      <FormField label="Require agreement for analysis" :label-width="8">
        <ToggleSwitch v-model="runtimeStore.requireProjectAgreement" />
      </FormField>
    </template>
    <Button label="Save Settings" class="mt-4" @click="updateSettings" />
  </Drawer>
</template>

<style lang="scss" scoped></style>
