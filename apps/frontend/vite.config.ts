import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
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
      //   target: "http://localhost:3000/",
      //   rewrite: (path) => path.replace(/^\/api/, ""),
      // },
      "/api": {
        target: "https://pharmacure.heracles.dataspac.es/",
        changeOrigin: true,
        headers: {
          Cookie:
            "connect.sid=s%3ArzQavsiNRxpHUrf9N7yFIDt6lgUcSBRr.g6tt8iD%2F64mTlq7ytmyKGiNB4oPt13x%2BInm8I6Qj2KQ",
        },
      },
      "/.well-known": {
        target: "http://localhost:3000/",
      },
      // '/api': 'https://issuer.oid4vci.heracles.dataspac.es/'
    },
  },
});
