import type { z } from "zod";
import moment from "moment-timezone";

import type { db as prismaDb } from "@waslaeuftin/db";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/api/internal/trpc";
import { trackCinemaView } from "@waslaeuftin/api/internal/umami";
import { Prisma } from "@waslaeuftin/db";
import {
  CinemaBySlugInputSchema,
  NearbyCinemasInputSchema,
} from "@waslaeuftin/validators";

type NearbyCinemasInput = z.infer<typeof NearbyCinemasInputSchema>;
type DbClient = typeof prismaDb;

const getNearbyCinemasForInput = async (
  input: NearbyCinemasInput,
  db: DbClient,
  options?: { includeTomorrow?: boolean },
) => {
  const includeTomorrow = options?.includeTomorrow ?? true;
  const nowInGermany = moment.tz("Europe/Berlin");
  const todayStart = (input.date ? moment(input.date) : nowInGermany)
    .clone()
    .startOf("day")
    .toDate();
  const endDate = (input.date ? moment(input.date) : nowInGermany)
    .clone()
    .add(includeTomorrow ? 1 : 0, "day")
    .endOf("day")
    .toDate();

  // Step 1: Find nearby cinema IDs + distances using raw SQL haversine
  const nearbyCinemaRows = await db.$queryRaw<
    { id: number; distance_km: number }[]
  >(Prisma.sql`
    SELECT sub.id, sub.distance_km
    FROM (
      SELECT
        c.id,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${input.latitude}))
              * cos(radians(COALESCE(c.latitude, city.latitude)))
              * cos(radians(COALESCE(c.longitude, city.longitude)) - radians(${input.longitude}))
              + sin(radians(${input.latitude}))
              * sin(radians(COALESCE(c.latitude, city.latitude)))
            ))
          )
        ) AS distance_km
      FROM "Cinema" c
      JOIN "City" city ON city.id = c."cityId"
      WHERE COALESCE(c.latitude, city.latitude) IS NOT NULL
        AND COALESCE(c.longitude, city.longitude) IS NOT NULL
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
  const cinemas = await db.cinema.findMany({
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
            lte: endDate,
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
};

type NearbyCinema = Awaited<
  ReturnType<typeof getNearbyCinemasForInput>
>[number];

const buildNearbyMovies = (nearbyCinemas: NearbyCinema[]) => {
  type NearbyMovie = NearbyCinema["movies"][number];
  type NearbyShowing = NearbyMovie["showings"][number];

  const nowTime = new Date().getTime();
  const groupedMoviesMap = new Map<
    string,
    {
      name: string;
      coverUrl: string | null;
      cinemas: {
        cinema: Omit<NearbyCinema, "movies">;
        showings: NearbyShowing[];
      }[];
      showingsCount: number;
      nextShowingDate?: Date;
    }
  >();

  for (const cinema of nearbyCinemas) {
    const { movies, ...cinemaWithoutMovies } = cinema;

    for (const movie of movies) {
      const futureShowings = movie.showings.filter(
        (showing) => showing.dateTime.getTime() > nowTime,
      );

      if (futureShowings.length === 0) {
        continue;
      }

      const nextShowingDate = futureShowings[0]?.dateTime;
      const existingMovie = groupedMoviesMap.get(movie.name);

      if (!existingMovie) {
        groupedMoviesMap.set(movie.name, {
          name: movie.name,
          coverUrl: movie.coverUrl,
          cinemas: [
            {
              cinema: cinemaWithoutMovies,
              showings: futureShowings,
            },
          ],
          showingsCount: futureShowings.length,
          nextShowingDate,
        });

        continue;
      }

      existingMovie.cinemas.push({
        cinema: cinemaWithoutMovies,
        showings: futureShowings,
      });
      existingMovie.showingsCount += futureShowings.length;

      if (!existingMovie.coverUrl && movie.coverUrl) {
        existingMovie.coverUrl = movie.coverUrl;
      }

      if (
        nextShowingDate &&
        (!existingMovie.nextShowingDate ||
          nextShowingDate.getTime() < existingMovie.nextShowingDate.getTime())
      ) {
        existingMovie.nextShowingDate = nextShowingDate;
      }
    }
  }

  const movies = Array.from(groupedMoviesMap.values());

  for (const movie of movies) {
    movie.cinemas.sort((left, right) => {
      const leftTime =
        left.showings[0]?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime =
        right.showings[0]?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;

      if (leftTime === rightTime) {
        return left.cinema.name.localeCompare(right.cinema.name);
      }

      return leftTime - rightTime;
    });
  }

  return movies.sort((left, right) => left.name.localeCompare(right.name));
};

export const cinemaRouter = createTRPCRouter({
  getCinemaBySlug: publicProcedure
    .input(CinemaBySlugInputSchema)
    .query(async ({ input, ctx }) => {
      const showingDateFilter = input.date
        ? {
            dateTime: {
              lt: moment(input.date).format("YYYY-MM-DD") + "T23:59:59.999Z",
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

      // ⚡ Bolt: Fire-and-forget analytics tracking to prevent blocking the API response
      void trackCinemaView(cinema, ctx.ip).catch(console.error);

      return {
        ...cinemaWithoutShowings,
        movies,
      };
    }),
  getNearbyCinemas: publicProcedure
    .input(NearbyCinemasInputSchema)
    .query(async ({ input, ctx }) => {
      return getNearbyCinemasForInput(input, ctx.db);
    }),
  getNearbyMovies: publicProcedure
    .input(NearbyCinemasInputSchema)
    .query(async ({ input, ctx }) => {
      const nearbyCinemas = await getNearbyCinemasForInput(input, ctx.db, {
        includeTomorrow: false,
      });
      return buildNearbyMovies(nearbyCinemas);
    }),
});
