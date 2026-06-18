import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` runs in CI (EAS install step) where DATABASE_URL is
    // not present. Falling back to a placeholder keeps config-loading from
    // throwing; generate never connects, and push/studio still pick up the
    // real value from ../../.env locally.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder",
  },
});
