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
      // "/api": {
      //   target: "http://localhost:3001/",
      // },
      // "/api": "https://dp.dataguard.heracles.dataspac.es/",
      // "/api": "https://dp.healthharbormc.heracles.dataspac.es/",
      "/api": {
        target: "https://dataguard.heracles.dataspac.es/analytics-data-plane",
        changeOrigin: true,
        headers: {
          Cookie:
            "connect.sid.tsghdp=s%3AQpLrUma0BrObYv8zRPLu9Wg2Vv5OTbP-.XKMYf1I5GvGSe6oFSXSaf%2BCCPmy1wFJvD16Pu1KjEBY",
        },
      },
    },
  },
});
