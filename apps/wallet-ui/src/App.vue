<script setup lang="ts">
import { onBeforeMount } from "vue";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import http from "@tsg-dsp/common-ui/utils/http";
import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";

const userStore = useUserStore();
userStore.login({ redirect: false });

const initialPreset = async () => {
  const settings = await http.get("/settings");
  const colorSetting = settings.data.color;
  updateColorPalette(colorSetting);
};

onBeforeMount(async () => {
  await initialPreset();
});
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <router-view />
</template>

<style scoped></style>
