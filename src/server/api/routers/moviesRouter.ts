import { env } from "@waslaeuftin/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { getCinemaxxVueMovies } from "@waslaeuftin/cinemaProviders/cinemaxx-vue/getCinemaxxVueMovies";
import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";
import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { getMyVueMovies } from "@waslaeuftin/cinemaProviders/myvue/getMyVueMovies";

export const moviesRouter = createTRPCRouter({
  updateComtradaCineOrderMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const comtradaCineOrderCinemas = await ctx.db.cinema.findMany({
        where: { comtradaCineOrderMetadata: { isNot: null } },
        include: { comtradaCineOrderMetadata: true },
      });

      const comtradaCineOrderData = await Promise.all(
        comtradaCineOrderCinemas.map((cinema) =>
          getComtradaCineOrderMovies(
            cinema.id,
            cinema.comtradaCineOrderMetadata!,
          ),
        ),
      );

      const comtradaCineOrderMovies = comtradaCineOrderData.flatMap(
        (data) => data.movies,
      );

      const comtradaCineOrderShowings = comtradaCineOrderData.flatMap(
        (data) => data.showings,
      );

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: comtradaCineOrderCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({
          data: comtradaCineOrderMovies,
          skipDuplicates: true,
        }),
        ctx.db.showing.createMany({
          data: comtradaCineOrderShowings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: comtradaCineOrderCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateCinemaxxVueMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const cinemaxxVueCinemas = await ctx.db.cinema.findMany({
        where: { cinemaxxVueCinemasMetadata: { isNot: null } },
        include: { cinemaxxVueCinemasMetadata: true },
      });

      const cinemaxxVueData = await Promise.all(
        cinemaxxVueCinemas.map((cinema) =>
          getCinemaxxVueMovies(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            cinema.cinemaxxVueCinemasMetadata!.cinemaId,
            cinema.id,
          ),
        ),
      );

      const cinemaxxVueMovies = cinemaxxVueData.flatMap((data) => data.movies);

      const cinemaxxVueShowings = cinemaxxVueData.flatMap(
        (data) => data.showings,
      );

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: cinemaxxVueCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({
          data: cinemaxxVueMovies,
          skipDuplicates: true,
        }),
        ctx.db.showing.createMany({
          data: cinemaxxVueShowings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: cinemaxxVueCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateCineplexMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const cineplexCinemas = await ctx.db.cinema.findMany({
        where: { cineplexCinemaId: { not: null } },
      });

      const { movies, showings } = await getCineplexMovies(
        cineplexCinemas.map((cinema) => ({
          cinemaId: cinema.id,
          cineplexCinemaId: cinema.cineplexCinemaId!,
        })),
      );

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: cineplexCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({ data: movies, skipDuplicates: true }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: cineplexCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateCineStarMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const cinestarCinemas = await ctx.db.cinema.findMany({
        where: { cineStarCinemaId: { not: null } },
      });

      const cineStarData = await Promise.all(
        cinestarCinemas.map((cinema) =>
          getCineStarMovies(cinema.id, cinema.cineStarCinemaId!),
        ),
      );

      const movies = cineStarData.flatMap((data) => data.movies);

      const showings = cineStarData.flatMap((data) => data.showings.flat());

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: cinestarCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({ data: movies, skipDuplicates: true }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: cinestarCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateKinoTicketsExpressMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const kinoTicketsExpressCinemas = await ctx.db.cinema.findMany({
        where: { isKinoTicketsExpress: true },
      });

      const kinoTicketsExpressData = await Promise.all(
        kinoTicketsExpressCinemas.map((cinema) =>
          getKinoTicketsExpressMovies(cinema.id, cinema.slug),
        ),
      );

      const movies = kinoTicketsExpressData.flatMap((data) => data.movies);

      const showings = kinoTicketsExpressData.flatMap((data) =>
        data.showings.flat(),
      );

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: kinoTicketsExpressCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({ data: movies, skipDuplicates: true }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: kinoTicketsExpressCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateKinoHeldMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const kinoHeldCinemas = await ctx.db.cinema.findMany({
        where: { kinoHeldCinemasMetadata: { isNot: null } },
        include: { kinoHeldCinemasMetadata: true },
      });

      const kinoHeldData = await Promise.all(
        kinoHeldCinemas.map((cinema) =>
          getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!),
        ),
      );

      const movies = kinoHeldData.flatMap((data) => data.movies);

      const showings = kinoHeldData.flatMap((data) => data.showings.flat());

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: kinoHeldCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({ data: movies, skipDuplicates: true }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: kinoHeldCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updatePremiumKinoMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const premiumKinoCinemas = await ctx.db.cinema.findMany({
        where: { premiumKinoSubdomain: { not: null } },
      });

      const premiumKinoData = await Promise.all(
        premiumKinoCinemas.map((cinema) =>
          getPremiumKinoMovies(cinema.id, cinema.premiumKinoSubdomain!),
        ),
      );

      const movies = premiumKinoData.flatMap((data) => data.movies);

      const showings = premiumKinoData.flatMap((data) => data.showings.flat());

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: premiumKinoCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({ data: movies, skipDuplicates: true }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: premiumKinoCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
  updateMyVueCinemasMovies: publicProcedure
    .input(z.object({ cronSecret: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (env.CRON_SECRET !== input.cronSecret) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      const myVueCinemas = await ctx.db.cinema.findMany({
        where: { myVueCinemaId: { not: null } },
      });

      const myVueData = await Promise.all(
        myVueCinemas.map((cinema) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          getMyVueMovies(cinema.id, cinema.myVueCinemaId ?? ""),
        ),
      );

      const movies = myVueData.flatMap((data) => data.movies);

      const showings = myVueData.flatMap((data) => data.showings.flat());

      await ctx.db.$transaction([
        ctx.db.movie.deleteMany({
          where: {
            cinemaId: {
              in: myVueCinemas.map((cinema) => cinema.id),
            },
          },
        }),
        ctx.db.movie.createMany({
          data: movies,
          skipDuplicates: true,
        }),
        ctx.db.showing.createMany({
          data: showings,
        }),
      ]);

      return await ctx.db.movie.count({
        where: {
          cinemaId: {
            in: myVueCinemas.map((cinema) => cinema.id),
          },
        },
      });
    }),
});
