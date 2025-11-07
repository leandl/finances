import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginJest from "eslint-plugin-jest";

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: {
      jest: eslintPluginJest,
      prettier: eslintPluginPrettier,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
