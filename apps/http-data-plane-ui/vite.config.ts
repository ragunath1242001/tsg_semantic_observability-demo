import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "fs";
import path from "path";

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
} catch (e) {}

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
    proxy: devSessions.local
      ? {
          "/api": {
            target: "http://localhost:3001/",
            rewrite: (path) => path.replace(/^\/api/, ""),
          },
        }
      : {
          "/api": {
            target: devSessions.target,
            changeOrigin: true,
            headers: {
              Cookie: devSessions.sessionCookie!,
            },
          },
        },
  },
});
