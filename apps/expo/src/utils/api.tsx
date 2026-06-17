import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@waslaeuftin/api";
import { getBaseUrl } from "@waslaeuftin/expo/utils/base-url";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 1, // 1 minute (serve from cache, refetch if older than 1 minute)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "WASLAEUFTIN_QUERY_CACHE",
});

/**
 * Vanilla tRPC client for imperative calls outside of React (e.g. device
 * registration on startup, notification-tap handlers).
 */
export const apiClient = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        __DEV__ || (opts.direction === "down" && opts.result instanceof Error),
      colorMode: "ansi",
    }),
    httpBatchLink({
      transformer: superjson,
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        const headers = new Map<string, string>();
        headers.set("x-trpc-source", "expo-react");

        return headers;
      },
    }),
  ],
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: apiClient,
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@waslaeuftin/api";
