<script setup lang="ts">
import { updatePreset, updateSurfacePalette } from "@primevue/themes";
import { useDspStore } from "./stores/dsp";
import { socket } from "./socket";
import { useUserStore } from "@tsg-dsp/common-ui/stores/user";
import { onBeforeMount } from "vue";
const dspStore = useDspStore();

socket.off();

dspStore.bindEvents();

const userStore = useUserStore();
userStore.login({ redirect: false });

const initialPreset = () => {
  const color = {
    name: "blue",
    palette: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  };
  const surface = {
    name: "slate",
    palette: {
      0: "#ffffff",
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
  };
  updatePreset({
    semantic: {
      primary: color.palette,
      colorScheme: {
        light: {
          primary: {
            color: "{primary.500}",
            contrastColor: "#ffffff",
            hoverColor: "{primary.600}",
            activeColor: "{primary.700}",
          },
          highlight: {
            background: "{primary.50}",
            focusBackground: "{primary.100}",
            color: "{primary.700}",
            focusColor: "{primary.800}",
          },
        },
        dark: {
          primary: {
            color: "{primary.400}",
            contrastColor: "{surface.900}",
            hoverColor: "{primary.300}",
            activeColor: "{primary.200}",
          },
          highlight: {
            background: "color-mix(in srgb, {primary.400}, transparent 84%)",
            focusBackground:
              "color-mix(in srgb, {primary.400}, transparent 76%)",
            color: "rgba(255,255,255,.87)",
            focusColor: "rgba(255,255,255,.87)",
          },
        },
      },
    },
  });
  updateSurfacePalette(surface.palette);
};

onBeforeMount(() => {
  initialPreset();
});
</script>

<template>
  <ConfirmDialog />
  <Toast />
  <router-view />
</template>

<style scoped></style>
