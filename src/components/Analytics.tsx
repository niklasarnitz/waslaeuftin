import { headers } from "next/headers";

export const Analytics = async () => {
    const hostname = (await headers()).get("host");

    if (hostname === "waslaeuft.in" && process.env.NODE_ENV === 'production') {
        return (
            <script defer src="https://api.arnitz.org/script.js" data-website-id="29498997-c3d1-4b41-9129-ee2a0a25ede6">
            </script>
        );
    }

    return null;
};
