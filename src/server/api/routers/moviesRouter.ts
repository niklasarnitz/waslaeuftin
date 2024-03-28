import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { CinemaSchema } from "@waslaeuftin/types/Cinema";
import moment from "moment";
import { z } from "zod";

export const moviesRouter = createTRPCRouter({
  getMovies: publicProcedure
    .input(z.object({ cinema: CinemaSchema, date: z.date().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.date) {
        return ctx.db.movie.findMany({
          where: {
            cinemaSlug: input.cinema.slug,
            showings: {
              some: {
                dateTime: {
                  lt:
                    moment(input.date).format("YYYY-MM-DD") + "T23:59:59.999Z",
                  gt: input.date.toISOString(),
                },
              },
            },
          },
          include: {
            showings: {
              where: {
                dateTime: {
                  lt:
                    moment(input.date).format("YYYY-MM-DD") + "T23:59:59.999Z",
                  gt: input.date.toISOString(),
                },
              },
            },
          },
        });
      } else {
        return ctx.db.movie.findMany({
          where: {
            cinemaSlug: input.cinema.slug,
          },
          include: {
            showings: true,
          },
        });
      }
    }),
  getMoviesForManyCinemas: publicProcedure
    .input(
      z.object({
        cinemas: z.array(CinemaSchema),
        date: z.date().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (input.date) {
        return ctx.db.movie.findMany({
          where: {
            cinemaSlug: {
              in: input.cinemas.map((cinema) => cinema.slug),
            },
            showings: {
              some: {
                dateTime: {
                  lt:
                    moment(input.date).format("YYYY-MM-DD") + "T23:59:59.999Z",
                  gt: input.date.toISOString(),
                },
              },
            },
          },
          include: {
            showings: {
              where: {
                dateTime: {
                  lt:
                    moment(input.date).format("YYYY-MM-DD") + "T23:59:59.999Z",
                  gt: input.date.toISOString(),
                },
              },
            },
          },
        });
      } else {
        return ctx.db.movie.findMany({
          where: {
            cinemaSlug: {
              in: input.cinemas.map((cinema) => cinema.slug),
            },
          },
          include: {
            showings: true,
          },
        });
      }
    }),
});
