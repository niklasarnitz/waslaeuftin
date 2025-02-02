import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { endOfDay, startOfDay } from "date-fns";
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

      if (!date) {
        date = new Date();
      }

      const showingsFilter = {
        dateTime: {
          gte: startOfDay(date).toISOString(),
          lte: endOfDay(date).toISOString(),
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
