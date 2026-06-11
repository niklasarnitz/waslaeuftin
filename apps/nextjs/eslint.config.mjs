import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "tailwind.config.ts"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "moment",
              message: "moment-timezone is used to ensure timezone support.",
            },
          ],
          patterns: [
            {
              regex: "^\\.{1,2}/",
              message:
                "Use an @waslaeuftin/* alias instead of a relative import.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportExpression[source.type='Literal'][source.value=/^\\.{1,2}\\//]",
          message:
            "Use an @waslaeuftin/* alias instead of a relative dynamic import.",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error",
    },
  },
];

export default config;
