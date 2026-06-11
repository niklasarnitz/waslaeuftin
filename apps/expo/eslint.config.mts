import { defineConfig } from "eslint/config";

import { baseConfig } from "@waslaeuftin/eslint-config/base";
import { reactConfig } from "@waslaeuftin/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
