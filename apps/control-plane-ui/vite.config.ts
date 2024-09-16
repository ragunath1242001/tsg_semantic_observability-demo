import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  base: "",
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
      // "/api": process.env.BACKEND || "http://localhost:3000",
      "/socket.io/": {
        target: "https://bravo.handson.dataspac.es/socket.io/",
        changeOrigin: true,
        headers: {
          Cookie:
            "connect.sid.tsgcp=s%3AnE_UFIhTgEUu89yFbjVPuFNxCbUO2ACs.Xs6zciC7XqHy73HBJ7k%2BoZ%2Fs%2B%2FWZV9%2Fhgv%2B4HJGjEKI",
        },
      },
      "/api": {
        target: "https://bravo.handson.dataspac.es/control-plane",
        changeOrigin: true,
        headers: {
          Cookie:
            "connect.sid.tsgcp=s%3AnE_UFIhTgEUu89yFbjVPuFNxCbUO2ACs.Xs6zciC7XqHy73HBJ7k%2BoZ%2Fs%2B%2FWZV9%2Fhgv%2B4HJGjEKI",
        },
      },
    },
  },
});
