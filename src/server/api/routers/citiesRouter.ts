import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { endOfDay } from "date-fns";
import moment from "moment-timezone";
import { z } from "zod";

export const citiesRouter = createTRPCRouter({
  getCityBySlug: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return await ctx.db.city.findUnique({
        where: {
          slug: input,
        },
      });
    }),
  getCities: publicProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.city.findMany({
        include: {
          cinemas: {
            select: {
              name: true,
              slug: true,
              id: true,
            },
            orderBy: { name: "asc" },
          },
          _count: {
            select: {
              cinemas: true,
            },
          },
        },
        orderBy: { name: "asc" },
        where: {
          name: input ? { contains: input, mode: "insensitive" } : undefined,
        },
      });
    }),
  getCityMoviesAndShowingsBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        date: z.date().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      let { date } = input;

      date ??= new Date();

      // Use moment to ensure correct day boundaries in UTC
      const start = moment(date).startOf("day").toDate();
      const end = moment(date).endOf("day").toDate();

      const showingsFilter = {
        dateTime: {
          gte: start,
          lte: end,
        },
      };

      return await ctx.db.city.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          cinemas: {
            orderBy: {
              name: "asc",
            },
            include: {
              movies: {
                orderBy: {
                  name: "asc",
                },
                include: {
                  showings: {
                    orderBy: {
                      dateTime: "asc",
                    },
                    where: showingsFilter,
                  },
                },
                where: {
                  showings: {
                    some: showingsFilter,
                  },
                },
              },
            },
          },
        },
      });
    }),

  getStartPageCities: publicProcedure
    .input(z.array(z.string()))
    .query(({ input, ctx }) => {
      const today = new Date();

      return ctx.db.city.findMany({
        orderBy: { name: "asc" },
        where: {
          slug: {
            in: input,
          },
        },
        include: {
          cinemas: {
            orderBy: { name: "asc" },
            include: {
              movies: {
                orderBy: { name: "asc" },
                include: {
                  showings: {
                    orderBy: { dateTime: "asc" },
                    where: {
                      dateTime: {
                        gte: today,
                        lte: endOfDay(today),
                      },
                    },
                  },
                },
                where: {
                  showings: {
                    some: {
                      dateTime: {
                        gte: today,
                        lte: endOfDay(today),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),
  getCityById: publicProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      return await ctx.db.city.findFirst({
        where: {
          id: input,
        },
      });
    }),
});
