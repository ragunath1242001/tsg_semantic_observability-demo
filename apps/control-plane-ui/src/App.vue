<script setup lang="ts">
import { useDspStore } from "./stores/dsp";
import { socket } from "./socket";
import { useUserStore } from "./stores/user";
import { useCatalogStore } from "./stores/catalog";
const dspStore = useDspStore();

socket.off();

dspStore.bindEvents();

const userStore = useUserStore();
userStore.login({ redirect: false });
const catalogStore = useCatalogStore();
</script>

<template>
  <div>
    <ConfirmDialog />
    <Toast />
    <router-view />
  </div>
</template>

<style scoped></style>
