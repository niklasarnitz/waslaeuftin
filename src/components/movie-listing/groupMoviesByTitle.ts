import { normalizeMovieTitle } from "@waslaeuftin/helpers/titleNormalization/normalizeMovieTitle";

import type {
  ListingCinema,
  ListingCinemaEntry,
  ListingMovieCard,
  ListingShowing,
} from "./types";

type SourceShowing = {
  id: number;
  dateTime: Date;
  bookingUrl?: string | null;
  rawMovieName: string;
  showingAdditionalData?: string[] | null;
};

type SourceMovie = {
  name: string;
  coverUrl: string | null;
  tmdbMetadata?: { popularity: number | null } | null;
  showings: SourceShowing[];
};

type SourceCinema = ListingCinema & {
  movies: SourceMovie[];
};

export function groupMoviesByTitle(
  cinemas: SourceCinema[],
  options?: {
    sortBy?: "popularity" | "name";
  },
): ListingMovieCard[] {
  const sortBy = options?.sortBy ?? "name";
  const now = new Date();

  // Cache to memoize expensive string transformations inside the hot loop
  const titleCache = new Map<string, ReturnType<typeof normalizeMovieTitle>>();

  const groupedMoviesMap = new Map<
    string,
    {
      name: string;
      coverUrl: string | null;
      tmdbPopularity: number | null;
      cinemaEntries: ListingCinemaEntry[];
      showingsCount: number;
      nextShowing?: ListingShowing;
    }
  >();

  cinemas.forEach((cinema) => {
    cinema.movies.forEach((movie) => {
      const showingsWithTags: ListingShowing[] = movie.showings
        .filter((showing) => showing.dateTime.getTime() > now.getTime())
        .map((showing) => {
          let tags: string[];
          const cached = titleCache.get(showing.rawMovieName);

          if (cached) {
            tags = cached.tags;
          } else {
            const normalized = normalizeMovieTitle(showing.rawMovieName);
            titleCache.set(showing.rawMovieName, normalized);
            tags = normalized.tags;
          }

          return {
            id: showing.id,
            dateTime: showing.dateTime,
            bookingUrl: showing.bookingUrl,
            rawMovieName: showing.rawMovieName,
            showingAdditionalData: showing.showingAdditionalData,
            tags,
          };
        });

      if (showingsWithTags.length === 0) {
        return;
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

        return;
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
    });
  });

  const sorted = Array.from(groupedMoviesMap.values())
    .filter((movie) => Boolean(movie.nextShowing))
    .sort((left, right) => {
      if (sortBy === "popularity") {
        const leftPopularity = left.tmdbPopularity ?? 0;
        const rightPopularity = right.tmdbPopularity ?? 0;

        if (leftPopularity !== rightPopularity) {
          return rightPopularity - leftPopularity;
        }
      }

      return left.name.localeCompare(right.name);
    });

  return sorted;
}
