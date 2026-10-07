import { headers } from "next/headers";

import { WebVitals } from "@waslaeuftin/components/WebVitals";
import { env } from "@waslaeuftin/env";

export const Analytics = async () => {
  const hostname = (await headers()).get("host");

  if (
    hostname === "waslaeuft.in" &&
    env.NODE_ENV === "production" &&
    env.UMAMI_URL &&
    env.UMAMI_WEBSITE_ID
  ) {
    return (
      <>
        <WebVitals />
        <script
          defer
          src={`${env.UMAMI_URL}/script.js`}
          data-website-id={env.UMAMI_WEBSITE_ID}
        ></script>
      </>
    );
  }

  return null;
};
