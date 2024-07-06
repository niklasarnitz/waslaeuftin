import { env } from "@waslaeuftin/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";
import { getCinemaxxVueMovies } from "@waslaeuftin/cinemaProviders/cinemaxx-vue/getCinemaxxVueMovies";
import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
// import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";

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

      const cinemaxxVueCinemas = await ctx.db.cinema.findMany({
        where: {
          cinemaxxVueCinemasMetadata: {
            isNot: null,
          },
        },
        include: {
          cinemaxxVueCinemasMetadata: true,
        },
      });

      const premiumKinoCinemas = await ctx.db.cinema.findMany({
        where: {
          premiumKinoSubdomain: {
            not: null,
          },
        },
      });

      const cineplexCinemas = await ctx.db.cinema.findMany({
        where: {
          cineplexCinemaId: {
            not: null,
          },
        },
      });

      const cinestarCinemas = await ctx.db.cinema.findMany({
        where: {
          cineStarCinemaId: {
            not: null,
          },
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

      const cinemaxxVueCinemasMovies = (
        await Promise.all(
          cinemaxxVueCinemas.map((cinema) =>
            getCinemaxxVueMovies(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              cinema.cinemaxxVueCinemasMetadata!.cinemaId,
              cinema.id,
            ),
          ),
        )
      ).flat();

      const premiumKinoCinemasMovies = (
        await Promise.all(
          premiumKinoCinemas.map((cinema) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument
            getPremiumKinoMovies(cinema.id, cinema.premiumKinoSubdomain!),
          ),
        )
      ).flat();

      const cineplexCinemasMovies =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument
        await getCineplexMovies(
          cineplexCinemas.map((cinema) => ({
            cinemaId: cinema.id,
            cineplexCinemaId: cinema.cineplexCinemaId!,
          })),
        );

      const cinestarMovies = (
        await Promise.all(
          cinestarCinemas.map((cinema) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument
            getCineStarMovies(cinema.id, cinema.cineStarCinemaId!),
          ),
        )
      ).flat();

      await ctx.db.showing.deleteMany({});
      await ctx.db.movie.deleteMany({});

      await Promise.all([
        ...comtradaCineOrderMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
        ...kinoHeldCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
        ...kinoTicketsExpressCinemasMovies.map((movie) =>
          ctx.db.movie.create({
            data: movie,
          }),
        ),
        ...cinemaxxVueCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
        ...premiumKinoCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
        ...cineplexCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
        ...cinestarMovies.map((movie) => ctx.db.movie.create({ data: movie })),
      ]);

      return await ctx.db.movie.count();
    }),
});
