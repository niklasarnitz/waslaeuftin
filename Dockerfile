# syntax=docker/dockerfile:1
# Production image for the Next.js app (waslaeuft.in), deployed by Komodo from niklasarnitz/ops.
# Node 22 + Bun image; the server runs on the Bun runtime (`bun --bun next start`, see apps/nextjs
# package.json) on port 3000. Plain `bun run` would honour next's node shebang and run on Node.
# The .ipa/.apk under apps/nextjs/public are Git LFS objects; the build context must contain the real files
# (the Image workflow checks them out with `git lfs pull`).

ARG BUN_VERSION=1.3.14
ARG NODE_VERSION=22.21.0

FROM oven/bun:${BUN_VERSION} AS bun

FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS build
# next.config.js derives the allowed next/image host from this at build time, so changing the
# storage host requires a rebuild. The Image workflow passes it from the S3_PUBLIC_BASE_URL repo variable.
ARG S3_PUBLIC_BASE_URL
COPY . .
# Fail early instead of shipping LFS pointer files as download links.
RUN if head -c 100 apps/nextjs/public/waslaeuftin.apk | grep -q '^version https://git-lfs'; then \
    echo "apps/nextjs/public contains Git LFS pointers; run 'git lfs pull' before building" >&2; exit 1; \
  fi
RUN bun install --frozen-lockfile
# Build with the non-secret placeholder env from .env.example; real values are only provided at runtime.
# UMAMI_* are left out: the Umami client contacts its host at module load.
RUN test -n "${S3_PUBLIC_BASE_URL}" || { echo "S3_PUBLIC_BASE_URL build arg is required" >&2; exit 1; }
RUN grep -v '^UMAMI_' .env.example > .env \
  && S3_PUBLIC_BASE_URL="${S3_PUBLIC_BASE_URL}" NODE_ENV=production bunx turbo run build --filter=@waslaeuftin/web... \
  && rm -rf .env apps/nextjs/.next/cache

FROM base AS runtime
ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  PORT=3000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
WORKDIR /app/apps/nextjs
CMD ["bun", "run", "start"]
