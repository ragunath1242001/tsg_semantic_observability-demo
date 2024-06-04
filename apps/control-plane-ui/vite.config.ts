import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "process.env": process.env,
  },
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
      "/api": process.env.BACKEND || "http://localhost:3000",
    },
  },
});
