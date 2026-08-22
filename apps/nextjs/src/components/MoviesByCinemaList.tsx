"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";

import type { WebShowingFilterOptions } from "@waslaeuftin/components/ShowingFilterBar";
import type { ListingCinema } from "@waslaeuftin/core";
import { CinemaFilterBar } from "@waslaeuftin/components/movie-listing/CinemaFilterBar";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { ShowingFilterBar } from "@waslaeuftin/components/ShowingFilterBar";
import { groupMoviesByTitle } from "@waslaeuftin/core";
import { useSortPreference } from "@waslaeuftin/hooks/useSortPreference";
import { type api } from "@waslaeuftin/trpc/server";

type CityMoviesAndShowings = NonNullable<
  Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
>;

export type MoviesByCinemaListProps = {
  city: CityMoviesAndShowings;
  date?: string;
};

export const MoviesByCinemaList = ({ city, date }: MoviesByCinemaListProps) => {
  void date;
  const [selectedCinemaSlugs, setSelectedCinemaSlugs] = useState<string[]>([]);
  const [showingFilters, setShowingFilters] = useState<WebShowingFilterOptions>(
    {
      selectedTags: [],
      timeWindow: "all",
    },
  );
  const [sortBy, setSortBy] = useSortPreference("popularity");

  const normalizedCinemas: Array<
    ListingCinema & {
      movies: (typeof city.cinemas)[number]["movies"];
    }
  > = useMemo(
    () =>
      city.cinemas.map((cinema) => ({
        id: cinema.id,
        slug: cinema.slug,
        name: cinema.name,
        city: { slug: city.slug, name: city.name },
        distanceKm: null,
        href: `/cinema/${cinema.slug}`,
        movies: cinema.movies,
      })),
    [city.cinemas],
  );

  const effectiveSelectedCinemaSlugs = useMemo(() => {
    const validSlugs = new Set(normalizedCinemas.map((cinema) => cinema.slug));
    return selectedCinemaSlugs.filter((slug) => validSlugs.has(slug));
  }, [normalizedCinemas, selectedCinemaSlugs]);

  const isCinemaFilterActive = effectiveSelectedCinemaSlugs.length > 0;

  const filteredCinemas = useMemo(() => {
    if (!isCinemaFilterActive) {
      return normalizedCinemas;
    }

    const selectedSet = new Set(effectiveSelectedCinemaSlugs);
    return normalizedCinemas.filter((cinema) => selectedSet.has(cinema.slug));
  }, [effectiveSelectedCinemaSlugs, isCinemaFilterActive, normalizedCinemas]);

  const toggleCinemaFilter = (cinemaSlug: string) => {
    setSelectedCinemaSlugs((prev) => {
      if (prev.includes(cinemaSlug)) {
        return prev.filter((slug) => slug !== cinemaSlug);
      }

      return [...prev, cinemaSlug];
    });
  };

  const groupedMovies = useMemo(
    () =>
      groupMoviesByTitle(filteredCinemas, {
        sortBy,
        filters: showingFilters,
      }),
    [filteredCinemas, showingFilters, sortBy],
  );

  const totalShowings = useMemo(() => {
    let count = 0;
    for (const movie of groupedMovies) {
      count += movie.showingsCount;
    }
    return count;
  }, [groupedMovies]);

  if (groupedMovies.length === 0 && !isCinemaFilterActive) {
    return (
      <div className="space-y-4">
        <ShowingFilterBar
          filters={showingFilters}
          onChangeFilters={setShowingFilters}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
        />
        <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">
          Für den ausgewählten Tag / Filter wurden keine Vorstellungen gefunden.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <ShowingFilterBar
          filters={showingFilters}
          onChangeFilters={setShowingFilters}
          sortBy={sortBy}
          onChangeSortBy={setSortBy}
        />
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
        <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
          {groupedMovies.length} Filme
        </span>
        <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
          {filteredCinemas.length}{" "}
          {filteredCinemas.length === 1 ? "Kino" : "Kinos"}{" "}
          {isCinemaFilterActive ? "ausgewählt" : "verfügbar"}
        </span>
        <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
          {totalShowings} Vorstellungen
        </span>
      </div>

      <div className="mt-2.5 sm:mt-3">
        <CinemaFilterBar
          options={normalizedCinemas.map(({ id, slug, name }) => ({
            id,
            slug,
            name,
          }))}
          selectedSlugs={effectiveSelectedCinemaSlugs}
          onToggle={toggleCinemaFilter}
          onClear={() => setSelectedCinemaSlugs([])}
        />
      </div>

      <div className="mt-4">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
            <Film className="text-primary h-4 w-4" />
            Filme in {city.name}
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

        {groupedMovies.length === 0 && (
          <p className="border-border text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-sm">
            In den ausgewählten Kinos sind aktuell keine Filme mit restlichen
            Vorstellungen verfügbar.
          </p>
        )}
      </div>
    </div>
  );
};
