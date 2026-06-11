import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { db } from "@waslaeuftin/db/client";

export const getClientIp = (headers: Headers): string | undefined => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first !== "unknown") return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && realIp !== "unknown") return realIp;

  return undefined;
};

export const createTRPCContext = (opts: { headers: Headers; ip?: string }) => ({
  db,
  ...opts,
});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
