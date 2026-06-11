"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";

import type { ListingCinema } from "@waslaeuftin/components/movie-listing/types";
import { CinemaFilterBar } from "@waslaeuftin/components/movie-listing/CinemaFilterBar";
import { groupMoviesByTitle } from "@waslaeuftin/components/movie-listing/groupMoviesByTitle";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { type api } from "@waslaeuftin/trpc/server";

type CityMoviesAndShowings = NonNullable<
  Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
>;

export const MoviesByCinemaList = ({
  city,
  date,
}: {
  city: CityMoviesAndShowings;
  date?: string;
}) => {
  const [selectedCinemaSlugs, setSelectedCinemaSlugs] = useState<string[]>([]);

  const normalizedCinemas: (ListingCinema & {
    movies: CityMoviesAndShowings["cinemas"][number]["movies"];
  })[] = useMemo(() => {
    return city.cinemas.map((cinema) => ({
      id: cinema.id,
      slug: cinema.slug,
      name: cinema.name,
      city: { slug: city.slug, name: city.name },
      distanceKm: null,
      href: `/cinema/${cinema.slug}${date ? `?date=${date}` : ""}`,
      movies: cinema.movies,
    }));
  }, [city, date]);

  const effectiveSelectedCinemaSlugs = useMemo(() => {
    if (selectedCinemaSlugs.length === 0) {
      return [];
    }

    const availableSlugs = new Set(normalizedCinemas.map((c) => c.slug));
    return selectedCinemaSlugs.filter((slug) => availableSlugs.has(slug));
  }, [normalizedCinemas, selectedCinemaSlugs]);

  const filteredCinemas = useMemo(() => {
    if (effectiveSelectedCinemaSlugs.length === 0) {
      return normalizedCinemas;
    }

    const selected = new Set(effectiveSelectedCinemaSlugs);
    return normalizedCinemas.filter((cinema) => selected.has(cinema.slug));
  }, [effectiveSelectedCinemaSlugs, normalizedCinemas]);

  const isCinemaFilterActive = effectiveSelectedCinemaSlugs.length > 0;

  const toggleCinemaFilter = (cinemaSlug: string) => {
    setSelectedCinemaSlugs((prev) => {
      if (prev.includes(cinemaSlug)) {
        return prev.filter((slug) => slug !== cinemaSlug);
      }

      return [...prev, cinemaSlug];
    });
  };

  const groupedMovies = useMemo(
    () => groupMoviesByTitle(filteredCinemas, { sortBy: "popularity" }),
    [filteredCinemas],
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
