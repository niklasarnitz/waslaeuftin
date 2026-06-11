import { Film } from "lucide-react";

import type { ListingCinema } from "@waslaeuftin/components/movie-listing/types";
import { groupMoviesByTitle } from "@waslaeuftin/components/movie-listing/groupMoviesByTitle";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { type api } from "@waslaeuftin/trpc/server";

export type CinemaMoviesProps = {
  cinema: NonNullable<Awaited<ReturnType<typeof api.cinemas.getCinemaBySlug>>>;
};

export const CinemaMovies = ({ cinema }: CinemaMoviesProps) => {
  const normalizedCinema: ListingCinema & {
    movies: typeof cinema.movies;
  } = {
    id: cinema.id,
    slug: cinema.slug,
    name: cinema.name,
    city: cinema.city ?? undefined,
    distanceKm: null,
    href: `/cinema/${cinema.slug}`,
    movies: cinema.movies,
  };

  const groupedMovies = groupMoviesByTitle([normalizedCinema], {
    sortBy: "popularity",
  });

  let totalShowings = 0;
  for (const movie of groupedMovies) {
    totalShowings += movie.showingsCount;
  }

  if (groupedMovies.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">
        Für den ausgewählten Tag wurden keine Vorstellungen gefunden.
      </div>
    );
  }

  return (
    <div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
        <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
          {groupedMovies.length} Filme
        </span>
        <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
          {totalShowings} Vorstellungen heute
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
            <Film className="text-primary h-4 w-4" />
            Filme im {cinema.name}
          </h3>
          <span className="text-muted-foreground text-xs">
            Sortiert nach Beliebtheit
          </span>
        </div>

        <div className="space-y-3">
          {groupedMovies.map((movie, index) => (
            <MovieCard
              key={movie.name}
              movie={movie}
              eagerCover={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
