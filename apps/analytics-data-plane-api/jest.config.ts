import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: { "^.+\\.ts?$": "ts-jest" },
  transformIgnorePatterns: [],
  testEnvironment: "node",
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coverageReporters: ["text", "text-summary", "cobertura"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.guard.ts",
    "!src/**/*.strategy.ts",
    "!src/**/*.controller.ts",
    "!src/**/*.module.ts",
    "!src/**/*.schemas.ts",
    "!src/migrations/**",
    "!src/migrations.executor.ts",
    "!node_modules/**"
  ]
};
export default config;
