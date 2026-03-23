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
      const normalizedQuery = input?.trim();

      return ctx.db.city.findMany({
        where: normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery, mode: "insensitive" } },
                {
                  cinemas: {
                    some: {
                      name: { contains: normalizedQuery, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : undefined,
        include: {
          cinemas: {
            where: normalizedQuery
              ? {
                  OR: [
                    {
                      name: { contains: normalizedQuery, mode: "insensitive" },
                    },
                    {
                      city: {
                        name: {
                          contains: normalizedQuery,
                          mode: "insensitive",
                        },
                      },
                    },
                  ],
                }
              : undefined,
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

      const city = await ctx.db.city.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          cinemas: {
            orderBy: {
              name: "asc",
            },
            include: {
              showings: {
                where: showingsFilter,
                orderBy: {
                  dateTime: "asc",
                },
                include: {
                  movie: {
                    select: {
                      id: true,
                      name: true,
                      coverUrl: true,
                      tmdbMetadata: {
                        select: {
                          popularity: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!city) {
        return null;
      }

      // Transform to preserve the movies[] shape per cinema for the frontend
      return {
        ...city,
        cinemas: city.cinemas.map((cinema) => {
          const movieMap = new Map<
            number,
            {
              name: string;
              coverUrl: string | null;
              tmdbMetadata: { popularity: number | null } | null;
              showings: typeof cinema.showings;
            }
          >();

          for (const showing of cinema.showings) {
            const existing = movieMap.get(showing.movie.id);
            if (existing) {
              existing.showings.push(showing);
            } else {
              movieMap.set(showing.movie.id, {
                name: showing.movie.name,
                coverUrl: showing.movie.coverUrl,
                tmdbMetadata: showing.movie.tmdbMetadata,
                showings: [showing],
              });
            }
          }

          const movies = Array.from(movieMap.values())
            .filter((movie) => movie.showings.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name));

          const { showings: _showings, ...cinemaWithoutShowings } = cinema;

          return {
            ...cinemaWithoutShowings,
            movies,
          };
        }),
      };
    }),

  getStartPageCities: publicProcedure
    .input(z.array(z.string()))
    .query(async ({ input, ctx }) => {
      const today = new Date();

      const cities = await ctx.db.city.findMany({
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
              showings: {
                where: {
                  dateTime: {
                    gte: today,
                    lte: endOfDay(today),
                  },
                },
                orderBy: { dateTime: "asc" },
                include: {
                  movie: {
                    select: {
                      id: true,
                      name: true,
                      coverUrl: true,
                      tmdbMetadata: {
                        select: {
                          popularity: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      return cities.map((city) => ({
        ...city,
        cinemas: city.cinemas.map((cinema) => {
          const movieMap = new Map<
            number,
            {
              name: string;
              coverUrl: string | null;
              tmdbMetadata: { popularity: number | null } | null;
              showings: typeof cinema.showings;
            }
          >();

          for (const showing of cinema.showings) {
            const existing = movieMap.get(showing.movie.id);
            if (existing) {
              existing.showings.push(showing);
            } else {
              movieMap.set(showing.movie.id, {
                name: showing.movie.name,
                coverUrl: showing.movie.coverUrl,
                tmdbMetadata: showing.movie.tmdbMetadata,
                showings: [showing],
              });
            }
          }

          const movies = Array.from(movieMap.values())
            .filter((movie) => movie.showings.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name));

          const { showings: _showings, ...cinemaWithoutShowings } = cinema;

          return {
            ...cinemaWithoutShowings,
            movies,
          };
        }),
      }));
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
