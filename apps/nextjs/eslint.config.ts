import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@acme/eslint-config/base";
import { nextjsConfig } from "@acme/eslint-config/nextjs";
import { reactConfig } from "@acme/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**", "prisma/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  {
    rules: {
      "react-hooks/purity": "off",
      "no-restricted-imports": [
        "error",
        {
          name: "moment",
          message: "moment-timezone is used to ensure timezone support.",
        },
      ],
    },
  },
);
