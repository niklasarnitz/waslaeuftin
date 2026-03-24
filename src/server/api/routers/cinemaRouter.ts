import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import moment from "moment-timezone";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const cinemaRouter = createTRPCRouter({
  getCinemaBySlug: publicProcedure
    .input(
      z.object({
        cinemaSlug: z.string(),
        date: z.date().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const showingDateFilter = input.date
        ? {
            dateTime: {
              lt:
                moment(input.date).format("YYYY-MM-DD") +
                "T23:59:59.999Z",
              gt: input.date.toISOString(),
            },
          }
        : undefined;

      const cinema = await ctx.db.cinema.findFirst({
        where: {
          slug: input.cinemaSlug,
        },
        include: {
          city: {
            select: {
              name: true,
              slug: true,
            },
          },
          showings: {
            where: showingDateFilter,
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
      });

      if (!cinema) {
        return null;
      }

      // Group showings by movie to preserve the movies[] shape for the frontend
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

      const movies = Object.values(movieMap).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const { showings: _showings, ...cinemaWithoutShowings } = cinema;

      return {
        ...cinemaWithoutShowings,
        movies,
      };
    }),
  getNearbyCinemas: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        maxDistanceKm: z.number().positive().max(250).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const nowInGermany = moment.tz("Europe/Berlin");
      const todayStart = nowInGermany.clone().startOf("day").toDate();
      const tomorrowEnd = nowInGermany.clone().add(1, "day").endOf("day").toDate();

      // Step 1: Find nearby cinema IDs + distances using raw SQL haversine
      const nearbyCinemaRows = await ctx.db.$queryRaw<
        Array<{ id: number; distance_km: number }>
      >(Prisma.sql`
        SELECT sub.id, sub.distance_km
        FROM (
          SELECT
            c.id,
            (
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(${input.latitude}))
                  * cos(radians(c.latitude))
                  * cos(radians(c.longitude) - radians(${input.longitude}))
                  + sin(radians(${input.latitude}))
                  * sin(radians(c.latitude))
                ))
              )
            ) AS distance_km
          FROM "Cinema" c
          WHERE c.latitude IS NOT NULL
            AND c.longitude IS NOT NULL
        ) sub
        WHERE sub.distance_km <= ${input.maxDistanceKm}
        ORDER BY sub.distance_km ASC
      `);

      if (nearbyCinemaRows.length === 0) {
        return [];
      }

      const cinemaIds = nearbyCinemaRows.map((row) => row.id);
      const distanceById = new Map(
        nearbyCinemaRows.map((row) => [row.id, Number(row.distance_km)]),
      );

      // Step 2: Fetch full cinema data with showings for only the nearby IDs.
      const cinemas = await ctx.db.cinema.findMany({
        where: {
          id: { in: cinemaIds },
        },
        include: {
          city: {
            select: {
              name: true,
              slug: true,
            },
          },
          showings: {
            where: {
              dateTime: {
                gte: todayStart,
                lte: tomorrowEnd,
              },
            },
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
      });

      return cinemas
        .map((cinema) => {
          // Group showings by movie
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

          const movies = Object.values(movieMap).sort((a, b) =>
            a.name.localeCompare(b.name),
          );

          const { showings: _showings, ...cinemaWithoutShowings } = cinema;

          return {
            ...cinemaWithoutShowings,
            movies,
            distanceKm: distanceById.get(cinema.id) ?? 0,
          };
        })
        .sort((left, right) => left.distanceKm - right.distanceKm);
    }),
});
