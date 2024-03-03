<script setup lang="ts">
import { useNegotiationStore } from "./stores/negotiations";
import { socket } from "./socket";
const store = useNegotiationStore();

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
