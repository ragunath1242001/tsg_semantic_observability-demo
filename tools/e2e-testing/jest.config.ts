import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          allowJs: true
        }
      }
    ]
  },
  // transformIgnorePatterns: ["node_modules/(?!(@apps|@tsg-dsp)/)"],
  testTimeout: 30000,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
  // coverageReporters: ["text", "text-summary", "cobertura"],
  // collectCoverageFrom: [
  //   "src/**/*.ts",
  //   "!src/**/*.guard.ts",
  //   "!src/**/*.strategy.ts",
  //   "!src/**/*.controller.ts",
  //   "!src/**/*.module.ts",
  //   "!src/**/*.schemas.ts",
  //   "!src/migrations/**",
  //   "!src/migrations.executor.ts",
  //   "!src/generate-oas.ts",
  //   "!node_modules/**",
  //   "src/did/**/*.strategy.ts"
  // ]
};
export default config;
