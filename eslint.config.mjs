import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
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
];

export default config;
