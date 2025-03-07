import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { readFileSync } from "fs";
import path from "path";
import { defineConfig } from "vite";

const swaggerShimFile =
  "node_modules/@nestjs/swagger/dist/extra/swagger-shim.js";

interface DevSession {
  local: boolean;
  target?: string;
  sessionCookie?: string;
}
let devSessions: DevSession = { local: true };
try {
  devSessions = JSON.parse(
    readFileSync(path.join(__dirname, "/dev.sessions.json"), "utf-8")
  );
} catch (e) {
  console.log(e);
}

// https://vitejs.dev/config/
export default defineConfig({
  base: "",
  envPrefix: "TSG_STATIC_",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@nestjs/swagger": path.resolve(__dirname, swaggerShimFile)
    }
  },
  optimizeDeps: {
    exclude: ["class-transformer/storage"]
  },
  build: {
    target: "ESNext"
  },
  server: {
    proxy: devSessions.local
      ? {
          "/api": {
            target: process.env.BACKEND ?? "http://localhost:3000",
            rewrite: (path) => path.replace(/^\/api/, "")
          }
        }
      : {
          "/api": {
            target: devSessions.target,
            changeOrigin: true,
            headers: {
              Cookie: devSessions.sessionCookie!
            }
          }
        }
  }
});
