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
        "**/*.test.ts",
        "**/*.spec.ts",
        "src/**/*.guard.ts",
        "src/**/*.controller.ts",
        "src/**/*.module.ts",
        "src/**/*.schemas.ts",
        "src/migrations/**",
        "src/migrations.executor.ts",
        "src/generate-oas.ts",
        "node_modules/**"
      ]
    }
  }
});
