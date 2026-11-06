import { type NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import {
  appRouter,
  createTRPCContext,
  getClientIp,
} from "@waslaeuftin/api/server";
import { env } from "@waslaeuftin/env";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
    ip: getClientIp(req.headers),
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      } else if (error.code === "INTERNAL_SERVER_ERROR") {
        // tRPC handles these itself, so Next's onRequestError never sees them.
        // Do not include inputs, procedure paths or request context.
        captureException(error.cause ?? error);
      }
    },
  });

export { handler as GET, handler as POST };
