"use client";

import { ArrowUpDown, Film } from "lucide-react";

import type { ListingCinema } from "@waslaeuftin/core";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { groupMoviesByTitle } from "@waslaeuftin/core";
import { useSortPreference } from "@waslaeuftin/hooks/useSortPreference";
import { type api } from "@waslaeuftin/trpc/server";

export type CinemaMoviesProps = {
  cinema: NonNullable<Awaited<ReturnType<typeof api.cinemas.getCinemaBySlug>>>;
};

export const CinemaMovies = ({ cinema }: CinemaMoviesProps) => {
  const [sortBy, setSortBy] = useSortPreference("popularity");

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
    sortBy,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
          <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
            {groupedMovies.length} Filme
          </span>
          <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
            {totalShowings} Vorstellungen heute
          </span>
        </div>

        <div className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs font-semibold">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sortierung:</span>
          <div className="bg-muted/80 border-border/60 inline-flex rounded-full border p-0.5">
            <button
              onClick={() => setSortBy("popularity")}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
                sortBy === "popularity"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Beliebtheit
            </button>
            <button
              onClick={() => setSortBy("name")}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
                sortBy === "name"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Name
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
            <Film className="text-primary h-4 w-4" />
            Filme im {cinema.name}
          </h3>
          <span className="text-muted-foreground text-xs">
            Sortiert nach {sortBy === "popularity" ? "Beliebtheit" : "Name"}
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
