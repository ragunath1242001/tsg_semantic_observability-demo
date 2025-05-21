// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        parser: "@typescript-eslint/parser"
      }
    }
  },
  {
    ignores: [
      "**/**/node_modules",
      "**/**/dist",
      "website/.docusaurus/**",
      "website/build/**",
      ".gitlab/**"
    ]
  },
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "no-await-in-loop": "warn",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "vue/multi-word-component-names": "warn",
      "vue/no-reserved-component-names": "warn"
    }
  }
);
