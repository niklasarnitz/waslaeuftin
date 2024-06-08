import { env } from "@waslaeuftin/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { getComtradaForumCinemasMovies } from "@waslaeuftin/cinemaProviders/comtrada/forum-cinemas/getComtradaForumCinemasMovies";
import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";

export const moviesRouter = createTRPCRouter({
  updateMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const comtradaCineOrderCinemas = await ctx.db.cinema.findMany({
        where: {
          comtradaCineOrderMetadata: {
            isNot: null,
          },
        },
        include: {
          comtradaCineOrderMetadata: true,
        },
      });

      const comtradaForumCinemas = await ctx.db.cinema.findMany({
        where: {
          forumCinemasMetadata: {
            isNot: null,
          },
        },
        include: {
          forumCinemasMetadata: true,
        },
      });

      const kinoHeldCinemas = await ctx.db.cinema.findMany({
        where: {
          kinoHeldCinemasMetadata: {
            isNot: null,
          },
        },
        include: {
          kinoHeldCinemasMetadata: true,
        },
      });

      const kinoTicketsExpressCinemas = await ctx.db.cinema.findMany({
        where: {
          isKinoTicketsExpress: true,
        },
      });

      const moviesToCreate = (
        await Promise.all([
          ...comtradaCineOrderCinemas.map((cinema) =>
            getComtradaCineOrderMovies(
              cinema.id,
              cinema.comtradaCineOrderMetadata!,
            ),
          ),
          ...comtradaForumCinemas.map((cinema) =>
            getComtradaForumCinemasMovies(
              cinema.id,
              cinema.forumCinemasMetadata!,
            ),
          ),
          ...kinoHeldCinemas.map((cinema) =>
            getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!),
          ),
          ...kinoTicketsExpressCinemas.map((cinema) =>
            getKinoTicketsExpressMovies(cinema.id, cinema.slug),
          ),
        ])
      ).flat();

      await ctx.db.showing.deleteMany({});
      await ctx.db.movie.deleteMany({});

      await Promise.all(
        moviesToCreate.map((movie) => ctx.db.movie.create({ data: movie })),
      );
    }),
});
