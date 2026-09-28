await import("@waslaeuftin/web/env");

const storageBaseUrl = process.env.S3_PUBLIC_BASE_URL;
const storageRemotePattern = storageBaseUrl
  ? (() => {
      const parsed = new URL(storageBaseUrl);
      return {
        protocol: /** @type {"http" | "https"} */ (
          parsed.protocol.replace(":", "")
        ),
        hostname: parsed.hostname,
        pathname: `${parsed.pathname.replace(/\/$/, "")}/**`,
      };
    })()
  : null;

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: [
    "@waslaeuftin/api",
    "@waslaeuftin/db",
    "@waslaeuftin/validators",
  ],
  images: {
    remotePatterns: storageRemotePattern ? [storageRemotePattern] : [],
  },
};

export default config;
