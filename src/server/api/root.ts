import { githubRouter } from "@waslaeuftin/server/api/routers/githubRouter";
import { moviesRouter } from "@waslaeuftin/server/api/routers/moviesRouter";
import {
  createCallerFactory,
  createTRPCRouter,
} from "@waslaeuftin/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  movies: moviesRouter,
  github: githubRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
