import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.guard.ts",
    "!src/**/*.strategy.ts",
    "!src/**/*.controller.ts",
    "!src/**/*.module.ts",
    "!node_modules/**",
  ],
};
export default config;
