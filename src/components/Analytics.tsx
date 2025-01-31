import { headers } from "next/headers";

export const Analytics = async () => {
  const hostname = (await headers()).get("host");

  if (hostname === "whatsshowing.in") {
    return (
      <script
        defer
        src="https://umami.app.niklas.services/script.js"
        data-website-id="837c78d5-b2ee-4c05-8075-9eab3b5d6980"
      ></script>
    );
  } else if (hostname === "waslaeuft.in") {
    return (
      <script
        defer
        src="https://umami.app.niklas.services/script.js"
        data-website-id="7538dcdd-2bff-4310-8b80-73c666f2d90a"
      ></script>
    );
  }
};
