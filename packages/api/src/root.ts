import { cinemaRouter } from "@waslaeuftin/api/internal/router/cinema";
import { citiesRouter } from "@waslaeuftin/api/internal/router/cities";
import { githubRouter } from "@waslaeuftin/api/internal/router/github";
import {
  createCallerFactory,
  createTRPCRouter,
} from "@waslaeuftin/api/internal/trpc";

export const appRouter = createTRPCRouter({
  cities: citiesRouter,
  github: githubRouter,
  cinemas: cinemaRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
