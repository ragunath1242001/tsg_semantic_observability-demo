import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      exclude: ["node_modules/**"]
    }
  }
});
