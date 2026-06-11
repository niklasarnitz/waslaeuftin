import moment from "moment-timezone";

import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/api/internal/trpc";
import { trackCityView } from "@waslaeuftin/api/internal/umami";
import {
  CityIdSchema,
  CityMoviesAndShowingsInputSchema,
  CityQuerySchema,
  CitySearchSchema,
  CitySlugSchema,
} from "@waslaeuftin/validators";

const SCHEDULE_TIMEZONE = "Europe/Berlin";

const getScheduleDate = (date: Date) => moment(date).tz(SCHEDULE_TIMEZONE);

export const citiesRouter = createTRPCRouter({
  getCityBySlug: publicProcedure
    .input(CitySlugSchema)
    .query(async ({ input, ctx }) => {
      const city = await ctx.db.city.findUnique({
        where: {
          slug: input,
        },
      });

      if (city) {
        // ⚡ Bolt: Fire-and-forget analytics tracking to prevent blocking the API response
        void trackCityView(city, ctx.ip).catch(console.error);
      }

      return city;
    }),
  getCities: publicProcedure
    .input(CityQuerySchema)
    .query(async ({ ctx, input }) => {
      const normalizedQuery = input?.trim();

      const cities = await ctx.db.city.findMany({
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

      return cities;
    }),
  getCityMoviesAndShowingsBySlug: publicProcedure
    .input(CityMoviesAndShowingsInputSchema)
    .query(async ({ input, ctx }) => {
      let { date } = input;

      date ??= new Date();

      // Use Berlin calendar days so mobile Date objects match the web URL dates.
      const scheduleDate = getScheduleDate(date);
      const start = scheduleDate.clone().startOf("day").toDate();
      const end = scheduleDate.clone().endOf("day").toDate();

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

      // Fire-and-forget analytics tracking to prevent blocking the API response.
      void trackCityView(city, ctx.ip).catch(console.error);

      // Transform to preserve the movies[] shape per cinema for the frontend
      return {
        ...city,
        cinemas: city.cinemas.map((cinema) => {
          const movieMap: Record<
            number,
            {
              name: string;
              coverUrl: string | null;
              tmdbMetadata: { popularity: number | null } | null;
              showings: typeof cinema.showings;
            }
          > = {};

          for (const showing of cinema.showings) {
            const existing = movieMap[showing.movie.id];
            if (existing !== undefined) {
              existing.showings.push(showing);
            } else {
              movieMap[showing.movie.id] = {
                name: showing.movie.name,
                coverUrl: showing.movie.coverUrl,
                tmdbMetadata: showing.movie.tmdbMetadata,
                showings: [showing],
              };
            }
          }

          const movies = Object.values(movieMap)
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

  search: publicProcedure
    .input(CitySearchSchema)
    .query(async ({ ctx, input }) => {
      const query = input.trim();

      const cityWhere = query
        ? { name: { contains: query, mode: "insensitive" as const } }
        : undefined;

      const cinemaWhere = query
        ? { name: { contains: query, mode: "insensitive" as const } }
        : undefined;

      const cities = await ctx.db.city.findMany({
        where: cityWhere,
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
        take: 5,
      });

      const cinemas = await ctx.db.cinema.findMany({
        where: cinemaWhere,
        select: {
          id: true,
          name: true,
          slug: true,
          city: { select: { name: true } },
        },
        orderBy: { name: "asc" },
        take: 5,
      });

      return { cities, cinemas };
    }),
  getCityById: publicProcedure
    .input(CityIdSchema)
    .query(async ({ input, ctx }) => {
      const city = await ctx.db.city.findFirst({
        where: {
          id: input,
        },
      });

      return city;
    }),
});
