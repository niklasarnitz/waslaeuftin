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

      const comtradaCineOrderMovies = (
        await Promise.all(
          comtradaCineOrderCinemas.map((cinema) =>
            getComtradaCineOrderMovies(
              cinema.id,
              cinema.comtradaCineOrderMetadata!,
            ),
          ),
        )
      ).flat();

      const comtradaForumCinemasMovies = (
        await Promise.all(
          comtradaForumCinemas.map((cinema) =>
            getComtradaForumCinemasMovies(
              cinema.id,
              cinema.forumCinemasMetadata!,
            ),
          ),
        )
      ).flat();

      const kinoHeldCinemasMovies = (
        await Promise.all(
          kinoHeldCinemas.map((cinema) =>
            getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!),
          ),
        )
      ).flat();

      const kinoTicketsExpressCinemasMovies = (
        await Promise.all(
          kinoTicketsExpressCinemas.map((cinema) =>
            getKinoTicketsExpressMovies(cinema.id, cinema.slug),
          ),
        )
      ).flat();

      await ctx.db.showing.deleteMany({});
      await ctx.db.movie.deleteMany({});

      const createdComtradaCineOrderMovies = await Promise.all(
        comtradaCineOrderMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdComtradaForumCinemasMovies = await Promise.all(
        comtradaForumCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdKinoHeldCinemasMovies = await Promise.all(
        kinoHeldCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdKinoTicketsExpressCinemasMovies = await Promise.all(
        kinoTicketsExpressCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      return {
        comtradaCineOrderMovies: createdComtradaCineOrderMovies,
        comtradaForumCinemasMovies: createdComtradaForumCinemasMovies,
        kinoHeldCinemasMovies: createdKinoHeldCinemasMovies,
        kinoTicketsExpressCinemasMovies: createdKinoTicketsExpressCinemasMovies,
      };
    }),
});
