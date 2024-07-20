import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { endOfDay, startOfDay } from "date-fns";
import { z } from "zod";

export const citiesRouter = createTRPCRouter({
  getCityMoviesAndShowingsBySlug: publicProcedure
    .input(z.object({ slug: z.string(), date: z.date().optional() }))
    .query(async ({ input, ctx }) => {
      const { date } = input;

      if (date) {
        const selectedDate = startOfDay(date).toISOString();

        const showingsFilter = {
          dateTime: {
            gte: selectedDate,
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
              where: {
                movies: {
                  some: {
                    showings: {
                      some: showingsFilter,
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        return await ctx.db.city.findUnique({
          where: { slug: input.slug },
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
                    },
                  },
                },
              },
            },
          },
        });
      }
    }),

  getStartPageCities: publicProcedure
    .input(z.object({ searchQuery: z.string().optional() }))
    .query(({ input, ctx }) => {
      const today = new Date();

      return ctx.db.city.findMany({
        orderBy: { name: "asc" },
        where: {
          name: input?.searchQuery
            ? { contains: input.searchQuery, mode: "insensitive" }
            : undefined,
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
