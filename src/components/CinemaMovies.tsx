import { Film } from "lucide-react";
import { type api } from "@waslaeuftin/trpc/server";

import { MovieCard } from "./movie-listing/MovieCard";
import { groupMoviesByTitle } from "./movie-listing/groupMoviesByTitle";
import type { ListingCinema } from "./movie-listing/types";

export type CinemaMoviesProps = {
  cinema: NonNullable<
    Awaited<ReturnType<typeof api.cinemas.getCinemaBySlug>>
  >;
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

  const totalShowings = groupedMovies.reduce(
    (total, movie) => total + movie.showingsCount,
    0,
  );

  if (groupedMovies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        Für den ausgewählten Tag wurden keine Vorstellungen gefunden.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
          {groupedMovies.length} Filme
        </span>
        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
          {totalShowings} Vorstellungen heute
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
            <Film className="h-4 w-4 text-primary" />
            Filme im {cinema.name}
          </h3>
          <span className="text-xs text-muted-foreground">
            Sortiert nach Beliebtheit
          </span>
        </div>

        <div className="space-y-3">
          {groupedMovies.map((movie) => (
            <MovieCard key={movie.name} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
};
