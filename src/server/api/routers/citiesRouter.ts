import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import moment from "moment-timezone";
import { z } from "zod";

export const citiesRouter = createTRPCRouter({
  getCityMoviesAndShowingsBySlug: publicProcedure
    .input(z.object({ slug: z.string(), date: z.date().optional() }))
    .query(async ({ input, ctx }) => {
      if (input.date) {
        const endOfDay = moment(input.date).endOf("day").toISOString();
        const selectedDate = moment(input.date).startOf("day").toISOString();

        const showingsFilter = {
          dateTime: {
            gte: selectedDate,
            lte: endOfDay,
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
      const endOfDay = moment().endOf("day").toISOString();
      const currentDate = moment().toISOString();

      const showingsFilter = {
        dateTime: {
          gte: currentDate,
          lte: endOfDay,
        },
      };

      return ctx.db.city.findMany({
        orderBy: {
          name: "asc",
        },
        where: {
          name:
            input?.searchQuery && input.searchQuery !== ""
              ? { contains: input.searchQuery, mode: "insensitive" }
              : undefined,
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
});
