import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import {
  createCaller,
  createTRPCContext,
  getClientIp,
} from "@waslaeuftin/api/server";

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
    ip: getClientIp(heads),
  });
});

export const api = createCaller(createContext);
