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
import { getCinemaxxVueMovies } from "@waslaeuftin/cinemaProviders/cinemaxx-vue/getCinemaxxVueMovies";
import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";

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

      const cineStarCinemas = await ctx.db.cinema.findMany({
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

      const cineStarCinemasMovies = (
        await Promise.all(
          cineStarCinemas.map((cinema) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument
            getCineStarMovies(cinema.id, cinema.cineStarCinemaId!),
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
          ctx.db.movie.create({
            data: {
              name: movie.name,
              cinema: {
                connect: {
                  id: movie.cinema.connect.id,
                },
              },
              showings: {
                createMany: {
                  data: movie.showings.createMany.data,
                },
              },
            },
          }),
        ),
      );

      const createdKinoHeldCinemasMovies = await Promise.all(
        kinoHeldCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdKinoTicketsExpressCinemasMovies = await Promise.all(
        kinoTicketsExpressCinemasMovies.map((movie) =>
          ctx.db.movie.create({
            data: {
              name: movie.name,
              cinema: {
                connect: {
                  id: movie.cinema.connect.id,
                },
              },
              showings: {
                createMany: {
                  data: movie.showings.createMany.data,
                },
              },
            },
          }),
        ),
      );

      const createdCinemaxxVueCinemasMovies = await Promise.all(
        cinemaxxVueCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdPremiumKinoCinemasMovies = await Promise.all(
        premiumKinoCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      const createdCineStarCinemasMovies = await Promise.all(
        cineStarCinemasMovies.map((movie) =>
          ctx.db.movie.create({ data: movie }),
        ),
      );

      return {
        comtradaCineOrderMovies: createdComtradaCineOrderMovies,
        comtradaForumCinemasMovies: createdComtradaForumCinemasMovies,
        kinoHeldCinemasMovies: createdKinoHeldCinemasMovies,
        kinoTicketsExpressCinemasMovies: createdKinoTicketsExpressCinemasMovies,
        cinemaxxVueCinemasMovies: createdCinemaxxVueCinemasMovies,
        premiumKinoCinemasMovies: createdPremiumKinoCinemasMovies,
        createdCineStarCinemasMovies: createdCineStarCinemasMovies,
      };
    }),
});
