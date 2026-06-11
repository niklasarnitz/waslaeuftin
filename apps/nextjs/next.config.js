await import("@waslaeuftin/web/env");

const minioBaseUrl = process.env.MINIO_PUBLIC_BASE_URL;
const minioRemotePattern = minioBaseUrl
  ? (() => {
      const parsed = new URL(minioBaseUrl);
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
    remotePatterns: minioRemotePattern ? [minioRemotePattern] : [],
  },
};

export default config;
