import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // useESM: true,
      },
    ],
  },
  moduleDirectories: ["src", "node_modules"],
  testTimeout: 30000,
  testEnvironment: "node",
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  coverageReporters: ["text", "text-summary", "cobertura"],
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
