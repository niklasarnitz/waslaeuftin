import { defineConfig } from "eslint/config";

import { baseConfig } from "@waslaeuftin/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  {
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
