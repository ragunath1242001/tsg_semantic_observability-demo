import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "cobertura"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.guard.ts",
        "src/**/*.schemas.ts",
        "src/**/*.strategy.ts",
        "src/**/*.controller.ts",
        "src/**/*.module.ts",
        "node_modules/**"
      ]
    }
  }
});
