import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: "",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "ESNext",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001/",
      },
      // "/api": "https://dp.dataguard.heracles.dataspac.es/",
      // "/api": "https://dp.healthharbormc.heracles.dataspac.es/",
    },
  },
});
