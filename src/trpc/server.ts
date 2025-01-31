import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCaller } from "@waslaeuftin/server/api/root";
import { createTRPCContext } from "@waslaeuftin/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const existingHeaders = await headers();

  const heads = new Headers(existingHeaders as HeadersInit);
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

export const api = createCaller(createContext);
