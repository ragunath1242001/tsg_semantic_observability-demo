import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    target: "ESNext"
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000/",
        rewrite: (path) => path.replace(/^\/api/, "")
      },
      "/.well-known": {
        target: "http://localhost:3000/"
      }
      // '/api': 'https://issuer.oid4vci.heracles.dataspac.es/'
    }
  }
});
