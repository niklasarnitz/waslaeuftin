"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Compass,
  Film,
  Loader2,
  MapPin,
  Navigation,
  Ticket,
} from "lucide-react";

import type { ListingCinema } from "@waslaeuftin/core";
import { CommandSearch } from "@waslaeuftin/components/CommandSearch";
import { CinemaFilterBar } from "@waslaeuftin/components/movie-listing/CinemaFilterBar";
import { MovieCard } from "@waslaeuftin/components/movie-listing/MovieCard";
import { Button } from "@waslaeuftin/components/ui/button";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import {
  createScheduleDate,
  formatDistance,
  formatShowingTime,
  groupMoviesByTitle,
  TAG_OPTIONS,
  TIME_OPTIONS,
  useShowingFilters,
} from "@waslaeuftin/core";
import { getDateString } from "@waslaeuftin/helpers/similarity/getDateString";
import { useSortPreference } from "@waslaeuftin/hooks/useSortPreference";
import { api } from "@waslaeuftin/trpc/react";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const DEFAULT_RADIUS_KM = 20;
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;
const RADIUS_COOKIE_NAME = "nearby-radius";
const RADIUS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
// Firefox never calls either callback when the permission prompt is dismissed
// or the OS denies location access, and the API timeout only starts after
// permission is granted, so we need our own watchdog.
const LOCATION_WATCHDOG_MS = 15000;

const getInitialRadius = () => {
  if (typeof document === "undefined") return DEFAULT_RADIUS_KM;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${RADIUS_COOKIE_NAME}=([^;]*)`),
  );
  return match
    ? Number.parseInt(match[1]!, 10) || DEFAULT_RADIUS_KM
    : DEFAULT_RADIUS_KM;
};

export const NearbyCinemasSection = ({ date }: { date?: string | null }) => {
  const dateQuery = date ? `?date=${encodeURIComponent(date)}` : "";
  const dateLabel = getDateString(date ?? new Date().toISOString());
  const filtersId = useId();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCinemaSlugs, setSelectedCinemaSlugs] = useState<string[]>([]);
  const { filters, toggleTag, selectTime, resetFilters } = useShowingFilters();
  const [sortBy, setSortBy] = useSortPreference("popularity");
  const [radiusKm, setRadiusKm] = useState(getInitialRadius);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState(getInitialRadius);
  const hasRequestedLocation = useRef(false);
  const locationRequestId = useRef(0);
  const locationWatchdog = useRef<number | undefined>(undefined);

  const applyRadius = (radius: number) => {
    setAppliedRadiusKm(radius);
    document.cookie = `${RADIUS_COOKIE_NAME}=${radius}; path=/; max-age=${RADIUS_COOKIE_MAX_AGE}; SameSite=Lax`;
  };

  const handleRadiusRelease = () => {
    setTimeout(() => applyRadius(radiusKm), 100);
  };

  const nearbyQuery = api.cinemas.getNearbyCinemas.useQuery(
    {
      latitude: coordinates?.latitude ?? 0,
      longitude: coordinates?.longitude ?? 0,
      maxDistanceKm: appliedRadiusKm,
      date: date ? createScheduleDate(0, new Date(date)) : undefined,
    },
    {
      enabled: Boolean(coordinates),
      refetchOnWindowFocus: false,
    },
  );

  const nearbyCinemas = useMemo(
    () => nearbyQuery.data ?? [],
    [nearbyQuery.data],
  );

  const normalizedCinemas: (ListingCinema & {
    movies: NonNullable<typeof nearbyQuery.data>[number]["movies"];
  })[] = useMemo(() => {
    return nearbyCinemas.map((cinema) => ({
      id: cinema.id,
      slug: cinema.slug,
      name: cinema.name,
      city: { slug: cinema.city.slug, name: cinema.city.name },
      distanceKm: cinema.distanceKm,
      href: `/cinema/${cinema.slug}${dateQuery}`,
      movies: cinema.movies,
    }));
  }, [nearbyCinemas, dateQuery]);

  const effectiveSelectedCinemaSlugs = useMemo(() => {
    if (selectedCinemaSlugs.length === 0) {
      return [];
    }

    const availableCinemaSlugs = new Set(
      normalizedCinemas.map((cinema) => cinema.slug),
    );

    return selectedCinemaSlugs.filter((selectedCinemaSlug) =>
      availableCinemaSlugs.has(selectedCinemaSlug),
    );
  }, [normalizedCinemas, selectedCinemaSlugs]);

  const filteredCinemas = useMemo(() => {
    if (effectiveSelectedCinemaSlugs.length === 0) {
      return normalizedCinemas;
    }

    const selectedCinemaSlugsSet = new Set(effectiveSelectedCinemaSlugs);

    return normalizedCinemas.filter((cinema) =>
      selectedCinemaSlugsSet.has(cinema.slug),
    );
  }, [effectiveSelectedCinemaSlugs, normalizedCinemas]);

  const isCinemaFilterActive = effectiveSelectedCinemaSlugs.length > 0;
  const drawerFilterCount =
    effectiveSelectedCinemaSlugs.length +
    filters.selectedTags.length +
    (appliedRadiusKm !== DEFAULT_RADIUS_KM ? 1 : 0);

  const toggleCinemaFilter = (cinemaSlug: string) => {
    setSelectedCinemaSlugs((previousSelectedCinemaSlugs) => {
      if (previousSelectedCinemaSlugs.includes(cinemaSlug)) {
        return previousSelectedCinemaSlugs.filter(
          (selectedCinemaSlug) => selectedCinemaSlug !== cinemaSlug,
        );
      }

      return [...previousSelectedCinemaSlugs, cinemaSlug];
    });
  };

  const nearbyMovies = useMemo(
    () => groupMoviesByTitle(filteredCinemas, { sortBy, filters }),
    [filteredCinemas, sortBy, filters],
  );

  const totalShowings = useMemo(() => {
    let count = 0;
    for (const movie of nearbyMovies) {
      count += movie.showingsCount;
    }
    return count;
  }, [nearbyMovies]);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Dein Browser unterstuetzt keine Standortfreigabe.");
      return;
    }

    const requestId = ++locationRequestId.current;
    setLocationError(null);
    setIsLocating(true);

    window.clearTimeout(locationWatchdog.current);
    locationWatchdog.current = window.setTimeout(() => {
      if (requestId !== locationRequestId.current) return;
      setLocationError(
        "Standort konnte nicht ermittelt werden. Bitte erlaube den Zugriff im Browser und versuche es erneut.",
      );
      setIsLocating(false);
    }, LOCATION_WATCHDOG_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // A late success (e.g. permission granted after the watchdog fired)
        // is still useful, so accept it as long as no newer request started.
        if (requestId !== locationRequestId.current) return;
        window.clearTimeout(locationWatchdog.current);
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
        setIsLocating(false);
      },
      (error) => {
        if (requestId !== locationRequestId.current) return;
        window.clearTimeout(locationWatchdog.current);
        if (error.code === 1) {
          setLocationError(
            "Standortzugriff wurde blockiert. Bitte erlaube den Zugriff im Browser.",
          );
        } else {
          setLocationError(
            "Standort konnte nicht gelesen werden. Bitte versuche es erneut.",
          );
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  };

  useEffect(() => {
    if (hasRequestedLocation.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      hasRequestedLocation.current = true;
      requestLocation();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const noNearbyCinemas =
    Boolean(coordinates) && nearbyQuery.isSuccess && nearbyCinemas.length === 0;
  const showSearch =
    nearbyCinemas.length === 0 &&
    (Boolean(locationError) || noNearbyCinemas || nearbyQuery.isError);

  return (
    <section className="sm:border-border/70 sm:via-background sm:rounded-[2rem] sm:border sm:bg-gradient-to-br sm:from-slate-50/90 sm:to-cyan-50/70 sm:p-5 sm:shadow-sm md:p-8 dark:sm:from-slate-950/60 dark:sm:to-slate-900/40">
      <div className="flex items-start justify-between gap-3">
        {!showSearch && (
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="border-border/70 bg-background/80 text-foreground/75 hidden items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase sm:inline-flex">
                <Navigation className="h-3.5 w-3.5" />
                In meiner Nähe
              </p>
              <div className="flex items-center gap-2 sm:mt-3">
                <h2 className="text-lg font-bold tracking-tight sm:text-2xl md:text-3xl">
                  <span className="sm:hidden">Filme in deiner Nähe</span>
                  <span className="hidden sm:inline">
                    Kinos rund um deinen Standort
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={isLocating}
                  title="Standort erneut abfragen"
                  aria-label="Standort erneut abfragen"
                  className="bg-primary text-primary-foreground focus-visible:ring-ring hidden shrink-0 items-center justify-center rounded-full p-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
                >
                  {isLocating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                  ) : (
                    <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
              <p className="text-muted-foreground mt-2 hidden max-w-2xl text-sm sm:block md:text-base">
                Diese Filme laufen {dateLabel} in deiner Nähe.
              </p>
            </div>
          </div>
        )}
        {showSearch && (
          <h2 className="text-lg font-semibold">
            {noNearbyCinemas ? "Keine Kinos gefunden" : "Finde dein Kino"}
          </h2>
        )}
        <UrlDatePicker compact />
      </div>

      {locationError && !showSearch && (
        <p className="border-border text-muted-foreground mt-4 rounded-xl border border-dashed px-3 py-2 text-sm">
          {locationError}
        </p>
      )}

      {isLocating && !coordinates && !locationError && (
        <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Standort wird ermittelt...
        </div>
      )}

      {nearbyQuery.isLoading && (
        <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Nahe Kinos werden geladen...
        </div>
      )}

      {showSearch && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              {noNearbyCinemas
                ? `Im Umkreis von ${appliedRadiusKm} km wurden keine Kinos mit Vorstellungen gefunden. Suche nach einer Stadt oder einem Kino.`
                : nearbyQuery.isError
                  ? "Kinos in deiner Nähe konnten nicht geladen werden. Suche stattdessen nach einer Stadt oder einem Kino."
                  : "Dein Standort ist nicht verfügbar. Suche nach einer Stadt oder einem Kino, um das Programm zu sehen."}
            </p>
          </div>
          <CommandSearch inline />
          <Button
            variant="ghost"
            onClick={requestLocation}
            disabled={isLocating}
          >
            <Compass aria-hidden="true" />
            Standort erneut versuchen
          </Button>
        </div>
      )}

      {nearbyCinemas.length > 0 && (
        <>
          <p className="text-muted-foreground mt-1 text-sm sm:hidden">
            {nearbyMovies.length} {nearbyMovies.length === 1 ? "Film" : "Filme"}
            {" · "}
            {filteredCinemas.length}{" "}
            {filteredCinemas.length === 1 ? "Kino" : "Kinos"}
            {" · "}
            {appliedRadiusKm} km
          </p>
          <div className="text-muted-foreground mt-5 hidden flex-wrap items-center gap-2 text-xs sm:flex">
            <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
              {nearbyMovies.length} Filme in der Nähe
            </span>
            <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
              {filteredCinemas.length}{" "}
              {filteredCinemas.length === 1 ? "Kino" : "Kinos"}{" "}
              {isCinemaFilterActive ? "ausgewählt" : "gefunden"}
            </span>
            <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
              {totalShowings} Vorstellungen
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <select
              aria-label="Vorstellungsbeginn"
              value={filters.timeWindow}
              onChange={(event) =>
                selectTime(event.target.value as typeof filters.timeWindow)
              }
              className={`border-border bg-background focus-visible:ring-ring h-10 min-w-0 rounded-lg border px-2 text-xs focus-visible:ring-2 focus-visible:outline-none sm:min-w-32 sm:text-sm ${filters.timeWindow !== "all" ? "border-primary text-primary" : ""}`}
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-expanded={isFiltersExpanded}
              aria-controls={filtersId}
              onClick={() => setIsFiltersExpanded((expanded) => !expanded)}
              className="border-border bg-background focus-visible:ring-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none sm:hidden"
            >
              Filter
              {drawerFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                  {drawerFilterCount}
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 transition-transform ${isFiltersExpanded ? "rotate-180" : ""}`}
              />
            </button>
            <select
              aria-label="Filme sortieren"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value === "name" ? "name" : "popularity")
              }
              className="border-border bg-background focus-visible:ring-ring h-10 min-w-0 rounded-lg border px-2 text-xs focus-visible:ring-2 focus-visible:outline-none sm:ml-auto sm:min-w-32 sm:text-sm"
            >
              <option value="popularity">Beliebtheit</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          <div
            id={filtersId}
            className={`${isFiltersExpanded ? "block" : "hidden"} border-border mt-3 space-y-3 rounded-xl border p-3 sm:block sm:border-0 sm:p-0`}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <label
                  htmlFor="nearby-radius"
                  className="font-semibold whitespace-nowrap"
                >
                  Umkreis: {radiusKm} km
                </label>
                <input
                  id="nearby-radius"
                  type="range"
                  min={MIN_RADIUS_KM}
                  max={MAX_RADIUS_KM}
                  step={5}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  onMouseUp={handleRadiusRelease}
                  onTouchEnd={handleRadiusRelease}
                  onKeyUp={handleRadiusRelease}
                  className="accent-primary focus-visible:ring-ring h-8 w-28 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={requestLocation}
                disabled={isLocating}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 sm:hidden"
              >
                <Compass aria-hidden="true" className="h-3.5 w-3.5" />
                Standort aktualisieren
              </button>
            </div>
            <CinemaFilterBar
              options={nearbyCinemas.map(({ id, slug, name }) => ({
                id,
                slug,
                name,
              }))}
              selectedSlugs={effectiveSelectedCinemaSlugs}
              onToggle={toggleCinemaFilter}
              onClear={() => setSelectedCinemaSlugs([])}
            />
            <fieldset>
              <legend className="text-muted-foreground mb-2 text-xs font-medium">
                Sprache & Format
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={filters.selectedTags.includes(option.id)}
                    onClick={() => toggleTag(option.id)}
                    className={`focus-visible:ring-ring min-h-8 rounded-full border px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-none ${filters.selectedTags.includes(option.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {(drawerFilterCount > 0 || filters.timeWindow !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCinemaSlugs([]);
                  resetFilters();
                  setRadiusKm(DEFAULT_RADIUS_KM);
                  applyRadius(DEFAULT_RADIUS_KM);
                }}
                className="text-primary focus-visible:ring-ring min-h-8 rounded-md text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                Alle Filter zurücksetzen
              </button>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-4 hidden items-center justify-between gap-2 sm:flex">
              <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
                <Film className="text-primary h-4 w-4" />
                Filme in deiner Nähe
              </h3>
            </div>

            <div className="space-y-3">
              {nearbyMovies.map((movie, index) => (
                <MovieCard
                  key={movie.name}
                  movie={movie}
                  eagerCover={index === 0}
                />
              ))}
            </div>

            {nearbyMovies.length === 0 && (
              <p className="border-border text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-sm">
                {filters.timeWindow !== "all" || filters.selectedTags.length > 0
                  ? "Keine Vorstellungen für diese Filter. Wähle eine andere Uhrzeit oder setze die Filter zurück."
                  : `In den ${isCinemaFilterActive ? "ausgewählten" : "gefundenen"} Kinos sind aktuell keine Filme mit restlichen Vorstellungen verfügbar.`}
              </p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-foreground/60 text-sm font-semibold tracking-[0.14em] uppercase">
              Kinos in der Nähe
            </h3>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
              {filteredCinemas.map((cinema) => {
                // ⚡ Bolt: Removed redundant nearbyCinemas.find() since cinema object already contains movies

                // ⚡ Bolt: Replace flatMap().sort()[0] with O(N) loop to avoid intermediate array allocations and O(N log N) sorting
                let nextShowing:
                  | (typeof cinema.movies)[number]["showings"][number]
                  | undefined = undefined;
                for (const movie of cinema.movies) {
                  for (const showing of movie.showings) {
                    if (
                      !nextShowing ||
                      showing.dateTime.getTime() <
                        nextShowing.dateTime.getTime()
                    ) {
                      nextShowing = showing;
                    }
                  }
                }

                return (
                  <article
                    key={cinema.id}
                    className="border-border/70 bg-background/80 hover:bg-background rounded-xl border p-3 transition-colors sm:rounded-2xl sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={cinema.href!}
                          className="text-sm font-semibold tracking-tight hover:underline sm:text-base"
                        >
                          {cinema.name}
                        </Link>
                        {cinema.city && (
                          <p className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-xs sm:mt-1.5 sm:text-sm">
                            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <Link
                              href={`/city/${cinema.city.slug}${dateQuery}`}
                              className="hover:underline"
                            >
                              {cinema.city.name}
                            </Link>
                          </p>
                        )}
                      </div>
                      {cinema.distanceKm != null && (
                        <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs">
                          {formatDistance(cinema.distanceKm)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] sm:mt-3 sm:gap-2 sm:text-xs">
                      <span className="border-border/80 text-foreground/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
                        {cinema.movies.length} Filme
                      </span>
                      <span className="border-border/80 text-foreground/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
                        {(() => {
                          let count = 0;
                          for (const movie of cinema.movies) {
                            count += movie.showings.length;
                          }
                          return count;
                        })()}{" "}
                        Vorstellungen
                      </span>
                    </div>

                    {nextShowing && (
                      <p className="bg-muted/40 text-muted-foreground mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] sm:mt-3 sm:px-2.5 sm:py-1.5 sm:text-xs">
                        <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        Nächste Vorstellung um{" "}
                        {formatShowingTime(
                          nextShowing.dateTime,
                          nextShowing.timeZone,
                        )}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
