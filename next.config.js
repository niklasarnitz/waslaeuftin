await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    experimental: {
        missingSuspenseWithCSRBailout: false,
    }
};

export default config;
