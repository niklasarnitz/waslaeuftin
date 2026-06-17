# Reminder-notification worker (node-cron). Build from the repo root:
#   docker build -f apps/worker/Dockerfile -t waslaeuftin-worker .
#
# Required runtime env: DATABASE_URL, TMDB_API_KEY (unused by matching but part
# of the shared env), and optionally EXPO_ACCESS_TOKEN, WORKER_CRON.
FROM oven/bun:1.3.14 AS base
WORKDIR /app

# Install dependencies using the workspace manifests for better layer caching.
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/validators/package.json packages/validators/package.json
COPY tooling tooling
RUN bun install --frozen-lockfile

# Bring in source and generate the Prisma client.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN bunx prisma generate --schema packages/db/prisma/schema.prisma

CMD ["bun", "run", "apps/worker/src/index.ts"]
