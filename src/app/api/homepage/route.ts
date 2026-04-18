import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeMovieTitle } from "@waslaeuftin/helpers/titleNormalization/normalizeMovieTitle";
import { createCaller } from "@waslaeuftin/server/api/root";
import { createTRPCContext, getClientIp } from "@waslaeuftin/server/api/trpc";

const rawLocationInputSchema = z
  .object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    maxDistanceKm: z.coerce.number().optional(),
    radiusKm: z.coerce.number().optional(),
  })
  .transform((value) => ({
    latitude: value.latitude ?? value.lat,
    longitude: value.longitude ?? value.lng,
    maxDistanceKm: value.maxDistanceKm ?? value.radiusKm ?? 20,
  }));

const locationInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  maxDistanceKm: z.number().positive().max(250).default(20),
});

const createApiCaller = (request: Request) =>
  createCaller(() => {
    const headers = new Headers(request.headers);
    return createTRPCContext({
      headers,
      ip: getClientIp(headers),
    });
  });

const buildHomepageMovieData = (
  nearbyCinemas: Awaited<
    ReturnType<
      ReturnType<typeof createApiCaller>["cinemas"]["getNearbyCinemas"]
    >
  >,
) => {
  type NearbyCinema = (typeof nearbyCinemas)[number];
  type NearbyShowing = NearbyCinema["movies"][number]["showings"][number];
  type NearbyShowingWithTags = NearbyShowing & {
    tags: string[];
    rawMovieName: string;
  };

  const groupedMoviesMap = new Map<
    string,
    {
      name: string;
      coverUrl: string | null;
      tmdbPopularity: number | null;
      cinemaEntries: Array<{
        cinema: NearbyCinema;
        showings: NearbyShowingWithTags[];
        nextShowing: NearbyShowing | undefined;
      }>;
      showingsCount: number;
      nextShowing: NearbyShowing | undefined;
    }
  >();

  // ⚡ Bolt: Hoist timestamp calculation out of nested loops
  const nowTime = new Date().getTime();
  // ⚡ Bolt: Memoize tags extraction to prevent expensive string/regex operations on the same titles
  const tagsCache = new Map<string, string[]>();

  for (const cinema of nearbyCinemas) {
    for (const movie of cinema.movies) {
      // ⚡ Bolt: Combine filter and map into a single loop to avoid intermediate array allocations
      const showingsWithTags: NearbyShowingWithTags[] = [];

      for (const showing of movie.showings) {
        if (showing.dateTime.getTime() > nowTime) {
          let tags = tagsCache.get(showing.rawMovieName);
          if (!tags) {
            tags = normalizeMovieTitle(showing.rawMovieName).tags;
            tagsCache.set(showing.rawMovieName, tags);
          }

          showingsWithTags.push({
            ...showing,
            tags,
            rawMovieName: showing.rawMovieName,
          });
        }
      }

      if (showingsWithTags.length === 0) {
        continue;
      }

      const nextShowing = showingsWithTags[0];
      const existingMovie = groupedMoviesMap.get(movie.name);
      const moviePopularity = movie.tmdbMetadata?.popularity ?? null;

      if (!existingMovie) {
        groupedMoviesMap.set(movie.name, {
          name: movie.name,
          coverUrl: movie.coverUrl,
          tmdbPopularity: moviePopularity,
          cinemaEntries: [
            {
              cinema,
              showings: showingsWithTags,
              nextShowing,
            },
          ],
          showingsCount: showingsWithTags.length,
          nextShowing,
        });

        continue;
      }

      existingMovie.cinemaEntries.push({
        cinema,
        showings: showingsWithTags,
        nextShowing,
      });
      existingMovie.showingsCount += showingsWithTags.length;

      if (!existingMovie.coverUrl && movie.coverUrl) {
        existingMovie.coverUrl = movie.coverUrl;
      }

      if (
        moviePopularity !== null &&
        (existingMovie.tmdbPopularity === null ||
          moviePopularity > existingMovie.tmdbPopularity)
      ) {
        existingMovie.tmdbPopularity = moviePopularity;
      }

      if (
        nextShowing &&
        (!existingMovie.nextShowing ||
          nextShowing.dateTime.getTime() <
            existingMovie.nextShowing.dateTime.getTime())
      ) {
        existingMovie.nextShowing = nextShowing;
      }
    }
  }

  const movies = Array.from(groupedMoviesMap.values())
    .filter((movie) => Boolean(movie.nextShowing))
    .sort((left, right) => {
      const leftPopularity = left.tmdbPopularity ?? 0;
      const rightPopularity = right.tmdbPopularity ?? 0;

      if (leftPopularity !== rightPopularity) {
        return rightPopularity - leftPopularity;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 18)
    .map((movie) => ({
      name: movie.name,
      coverUrl: movie.coverUrl,
      tmdbPopularity: movie.tmdbPopularity,
      showingsCount: movie.showingsCount,
      nextShowing: movie.nextShowing,
      cinemas: movie.cinemaEntries.map((entry) => ({
        cinema: {
          id: entry.cinema.id,
          name: entry.cinema.name,
          slug: entry.cinema.slug,
          distanceKm: entry.cinema.distanceKm,
          city: entry.cinema.city,
        },
        showings: entry.showings,
        nextShowing: entry.nextShowing,
      })),
    }));

  let totalShowings = 0;
  for (const cinema of nearbyCinemas) {
    for (const movie of cinema.movies) {
      totalShowings += movie.showings.length;
    }
  }

  return {
    totalShowings,
    movies,
  };
};

const getLocationInputFromRequest = (request: Request) => {
  const { searchParams } = new URL(request.url);

  return locationInputSchema.parse(
    rawLocationInputSchema.parse({
      latitude: searchParams.get("latitude") ?? undefined,
      longitude: searchParams.get("longitude") ?? undefined,
      lat: searchParams.get("lat") ?? undefined,
      lng: searchParams.get("lng") ?? undefined,
      maxDistanceKm: searchParams.get("maxDistanceKm") ?? undefined,
      radiusKm: searchParams.get("radiusKm") ?? undefined,
    }),
  );
};

const handleRequest = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    let date: Date | undefined;

    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        date = undefined;
      }
    }

    const locationInput = getLocationInputFromRequest(request);
    const caller = createApiCaller(request);

    const nearbyCinemas = await caller.cinemas.getNearbyCinemas({
      latitude: locationInput.latitude,
      longitude: locationInput.longitude,
      maxDistanceKm: locationInput.maxDistanceKm,
      date,
    });

    const homepageMovieData = buildHomepageMovieData(nearbyCinemas);

    return NextResponse.json({
      location: locationInput,
      summary: {
        cinemaCount: nearbyCinemas.length,
        movieCount: homepageMovieData.movies.length,
        totalShowings: homepageMovieData.totalShowings,
      },
      cinemas: nearbyCinemas,
      movies: homepageMovieData.movies,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Invalid location input",
          errors: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error("Failed to generate homepage API payload", error);

    return NextResponse.json(
      {
        message: "Failed to fetch homepage data",
      },
      {
        status: 500,
      },
    );
  }
};

export const GET = handleRequest;
