import { env } from "@waslaeuftin/env";
import { headers } from "next/headers";

export const Analytics = async () => {
    const hostname = (await headers()).get("host");

    if (hostname === "waslaeuft.in" && env.NODE_ENV === 'production') {
        return (
            <script defer src={`${env.UMAMI_URL}/script.js`} data-website-id={env.UMAMI_WEBSITE_ID}>
            </script>
        );
    }

    return null;
};
