import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@waslaeuftin/env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const createPrismaClient = () =>
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn", "info"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
