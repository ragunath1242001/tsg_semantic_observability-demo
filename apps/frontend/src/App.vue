<script setup lang="ts">
import { useDspStore } from "./stores/dsp";
import { socket } from "./socket";
const store = useDspStore();

socket.off();

store.bindEvents();
</script>

<template>
  <div>
    <Toast />
    <router-view />
  </div>
</template>

<style scoped></style>
