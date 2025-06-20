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
  testTimeout: 30000,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  testRegex: "/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  }
};
export default config;
