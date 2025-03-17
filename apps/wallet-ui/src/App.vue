<script setup lang="ts">
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";
import { onBeforeMount } from "vue";

import { useRuntimeStore } from "./stores/runtime";

const userStore = useUserStore();

const runtimeStore = useRuntimeStore();

const initialPreset = async () => {
  await runtimeStore.getRuntimeSettings();
  const colorSetting = runtimeStore.color;
  updateColorPalette(colorSetting);
};

onBeforeMount(async () => {
  await userStore.fetchUserInfo();
  await initialPreset();
});
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <DynamicDialog />
  <router-view />
</template>

<style scoped></style>
