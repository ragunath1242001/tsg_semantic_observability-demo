import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true
      }
    ]
  },
  // transformIgnorePatterns: ["node_modules/(?!@tsg-dsp)"],
  testTimeout: 30000,
  testEnvironment: "node",
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  coverageReporters: ["text", "text-summary", "cobertura"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.guard.ts",
    "!src/**/*.schemas.ts",
    "!src/**/*.strategy.ts",
    "!src/**/*.controller.ts",
    "!src/**/*.module.ts",
    "!src/migrations/**",
    "!src/migrations.executor.ts",
    "!node_modules/**"
  ]
};
export default config;
