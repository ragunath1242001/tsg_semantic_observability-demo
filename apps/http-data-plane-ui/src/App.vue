<script setup lang="ts">
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";
import http from "@tsg-dsp/common-ui/utils/http";
import { onBeforeMount } from "vue";

const userStore = useUserStore();

const initialPreset = async () => {
  try {
    const settings = await http.get("/settings");
    const colorSetting = settings.data.color;
    updateColorPalette(colorSetting);
  } catch (error) {
    console.debug("Could not load runtime settings", error);
  }
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
