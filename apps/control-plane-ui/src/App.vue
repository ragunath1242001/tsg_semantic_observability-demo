<script setup lang="ts">
import { useDspStore } from "./stores/dsp";
import { socket } from "./socket";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { onBeforeMount } from "vue";
import http from "@tsg-dsp/common-ui/utils/http";
import { updateColorPalette } from "@tsg-dsp/common-ui/utils/color";
const dspStore = useDspStore();

socket.off();

dspStore.bindEvents();

const userStore = useUserStore();

const initialPreset = async () => {
  const settings = await http.get("/settings");
  const colorSetting = settings.data.color;
  updateColorPalette(colorSetting);
};

onBeforeMount(async () => {
  await userStore.fetchUserInfo();
  await initialPreset();
});
</script>

<template>
  <ConfirmDialog />
  <Toast />
  <router-view />
</template>

<style scoped></style>
