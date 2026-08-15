import type {
  ListingCinema,
  ListingCinemaEntry,
  ListingMovieCard,
  ListingShowing,
} from "@waslaeuftin/components/movie-listing/types";
import { normalizeMovieTitle } from "@waslaeuftin/helpers/titleNormalization/normalizeMovieTitle";

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
  tmdbMetadata?: any | null;
  showings: SourceShowing[];
};

type SourceCinema = ListingCinema & {
  movies: SourceMovie[];
};

export function groupMoviesByTitle(
  cinemas: SourceCinema[],
  options?: {
    sortBy?: "popularity" | "name";
    filters?: {
      selectedTags?: string[];
      timeWindow?: "all" | "14" | "18" | "21";
    };
  },
): ListingMovieCard[] {
  const sortBy = options?.sortBy ?? "name";
  const filters = options?.filters;
  const nowTime = new Date().getTime();

  const groupedMoviesMap = new Map<
    string,
    {
      name: string;
      coverUrl: string | null;
      tmdbPopularity: number | null;
      tmdbMetadata?: any | null;
      cinemaEntries: ListingCinemaEntry[];
      showingsCount: number;
      nextShowing?: ListingShowing;
    }
  >();

  // Memoize tags extraction to prevent expensive string/regex operations on the same titles
  const tagsCache = new Map<string, string[]>();

  cinemas.forEach((cinema) => {
    cinema.movies.forEach((movie) => {
      const showingsWithTags: ListingShowing[] = [];

      for (const showing of movie.showings) {
        if (showing.dateTime.getTime() > nowTime) {
          let tags = tagsCache.get(showing.rawMovieName);
          if (!tags) {
            tags = normalizeMovieTitle(showing.rawMovieName).tags;
            tagsCache.set(showing.rawMovieName, tags);
          }

          // Check filters
          if (filters) {
            if (filters.timeWindow && filters.timeWindow !== "all") {
              const hour = showing.dateTime.getHours();
              const minHour = parseInt(filters.timeWindow, 10);
              if (hour < minHour) continue;
            }

            if (filters.selectedTags && filters.selectedTags.length > 0) {
              const allTagsStr = [...tags, ...(showing.showingAdditionalData ?? [])]
                .join(" ")
                .toUpperCase();

              let matchesAll = true;
              for (const filterTag of filters.selectedTags) {
                const target = filterTag.toUpperCase();
                if (target === "OV") {
                  if (!/\b(OV|ORIGINALVERSION|ENGLISH|ENGLISCH)\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else if (target === "OMU") {
                  if (!/\b(OMU|OMUD|UNTERTITEL)\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else if (target === "3D") {
                  if (!/\b3D\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else if (target === "IMAX") {
                  if (!/\bIMAX\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else if (target === "70MM/35MM" || target === "70MM" || target === "35MM") {
                  if (!/\b(70\s*-?\s*MM|35\s*-?\s*MM)\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else if (target === "ATMOS") {
                  if (!/\b(ATMOS|DOLBY\s*ATMOS)\b/i.test(allTagsStr)) {
                    matchesAll = false;
                    break;
                  }
                } else {
                  if (!allTagsStr.includes(target)) {
                    matchesAll = false;
                    break;
                  }
                }
              }
              if (!matchesAll) continue;
            }
          }

          showingsWithTags.push({
            id: showing.id,
            dateTime: showing.dateTime,
            bookingUrl: showing.bookingUrl,
            rawMovieName: showing.rawMovieName,
            showingAdditionalData: showing.showingAdditionalData,
            tags,
          });
        }
      }

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
          tmdbMetadata: movie.tmdbMetadata,
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

      if (!existingMovie.tmdbMetadata && movie.tmdbMetadata) {
        existingMovie.tmdbMetadata = movie.tmdbMetadata;
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

  const sorted = [];
  for (const movie of groupedMoviesMap.values()) {
    if (movie.nextShowing) {
      sorted.push(movie);
    }
  }

  sorted.sort((left, right) => {
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
