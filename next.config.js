await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    experimental: {
        reactCompiler: true
    },
};

export default config;
