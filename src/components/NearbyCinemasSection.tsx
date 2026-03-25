"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Film, Loader2, MapPin, Navigation, Ticket } from "lucide-react";

import { api } from "@waslaeuftin/trpc/react";

import { CinemaFilterBar } from "./movie-listing/CinemaFilterBar";
import { MovieCard } from "./movie-listing/MovieCard";
import { groupMoviesByTitle } from "./movie-listing/groupMoviesByTitle";
import { formatDistance, formatShowingTime } from "./movie-listing/formatters";
import type { ListingCinema } from "./movie-listing/types";

type Coordinates = {
    latitude: number;
    longitude: number;
};

const DEFAULT_RADIUS_KM = 20;
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;
const RADIUS_COOKIE_NAME = "nearby-radius";
const RADIUS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const getInitialRadius = () => {
    if (typeof document === "undefined") return DEFAULT_RADIUS_KM;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${RADIUS_COOKIE_NAME}=([^;]*)`));
    return match ? Number.parseInt(match[1]!, 10) || DEFAULT_RADIUS_KM : DEFAULT_RADIUS_KM;
};

export const NearbyCinemasSection = () => {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [selectedCinemaSlugs, setSelectedCinemaSlugs] = useState<string[]>([]);
    const [radiusKm, setRadiusKm] = useState(getInitialRadius);
    const [appliedRadiusKm, setAppliedRadiusKm] = useState(getInitialRadius);
    const hasRequestedLocation = useRef(false);

    const handleRadiusRelease = () => {
        setTimeout(() => {
            setAppliedRadiusKm(radiusKm);
            document.cookie = `${RADIUS_COOKIE_NAME}=${radiusKm}; path=/; max-age=${RADIUS_COOKIE_MAX_AGE}; SameSite=Lax`;
        }, 100);
    };

    const nearbyQuery = api.cinemas.getNearbyCinemas.useQuery(
        {
            latitude: coordinates?.latitude ?? 0,
            longitude: coordinates?.longitude ?? 0,
            maxDistanceKm: appliedRadiusKm,
        },
        {
            enabled: Boolean(coordinates),
            refetchOnWindowFocus: false,
        },
    );

    const nearbyCinemas = useMemo(() => nearbyQuery.data ?? [], [nearbyQuery.data]);

    const normalizedCinemas: (ListingCinema & {
        movies: NonNullable<typeof nearbyQuery.data>[number]["movies"];
    })[] = useMemo(() => {
        return nearbyCinemas.map((cinema) => ({
            id: cinema.id,
            slug: cinema.slug,
            name: cinema.name,
            city: { slug: cinema.city.slug, name: cinema.city.name },
            distanceKm: cinema.distanceKm,
            href: `/cinema/${cinema.slug}`,
            movies: cinema.movies,
        }));
    }, [nearbyCinemas]);

    const effectiveSelectedCinemaSlugs = useMemo(() => {
        if (selectedCinemaSlugs.length === 0) {
            return [];
        }

        const availableCinemaSlugs = new Set(normalizedCinemas.map((cinema) => cinema.slug));

        return selectedCinemaSlugs.filter((selectedCinemaSlug) =>
            availableCinemaSlugs.has(selectedCinemaSlug),
        );
    }, [normalizedCinemas, selectedCinemaSlugs]);

    const filteredCinemas = useMemo(() => {
        if (effectiveSelectedCinemaSlugs.length === 0) {
            return normalizedCinemas;
        }

        const selectedCinemaSlugsSet = new Set(effectiveSelectedCinemaSlugs);

        return normalizedCinemas.filter((cinema) => selectedCinemaSlugsSet.has(cinema.slug));
    }, [effectiveSelectedCinemaSlugs, normalizedCinemas]);

    const isCinemaFilterActive = effectiveSelectedCinemaSlugs.length > 0;

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
        () => groupMoviesByTitle(filteredCinemas, { sortBy: "popularity" }),
        [filteredCinemas],
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

        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                if (error.code === 1) {
                    setLocationError("Standortzugriff wurde blockiert. Bitte erlaube den Zugriff im Browser.");
                    return;
                }

                setLocationError("Standort konnte nicht gelesen werden. Bitte versuche es erneut.");
            },
            {
                enableHighAccuracy: false,
                timeout: 12000,
            },
        );
    };

    useEffect(() => {
        if (hasRequestedLocation.current) {
            return;
        }

        hasRequestedLocation.current = true;

        const timeoutId = window.setTimeout(() => {
            requestLocation();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    return (
        <section className="sm:rounded-[2rem] sm:border sm:border-border/70 sm:bg-gradient-to-br sm:from-slate-50/90 sm:via-background sm:to-cyan-50/70 sm:p-5 sm:shadow-sm md:p-8 dark:sm:from-slate-950/60 dark:sm:to-slate-900/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/75">
                        <Navigation className="h-3.5 w-3.5" />
                        In meiner Nähe
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Kinos rund um deinen Standort</h2>
                        <button
                            type="button"
                            onClick={requestLocation}
                            title="Standort erneut abfragen"
                            className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary p-1.5 text-primary-foreground transition hover:opacity-90 sm:p-2"
                        >
                            <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:mt-2 md:text-base">
                        Diese Filme laufen heute und morgen in deiner Nähe.
                    </p>
                </div>
            </div>

            {locationError && (
                <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    {locationError}
                </p>
            )}

            {nearbyQuery.isLoading && (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Nahe Kinos werden geladen...
                </div>
            )}

            {nearbyCinemas.length > 0 && (
                <>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:mt-5 sm:gap-2 sm:text-xs">
                        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
                            {nearbyMovies.length} Filme in der Nähe
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
                            {filteredCinemas.length}{" "}
                            {filteredCinemas.length === 1 ? "Kino" : "Kinos"}{" "}
                            {isCinemaFilterActive ? "ausgewählt" : "gefunden"}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
                            {totalShowings} Vorstellungen
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
                            <label htmlFor="nearby-radius" className="whitespace-nowrap font-semibold">
                                Radius: {radiusKm} km
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
                                className="h-3 w-20 accent-primary sm:w-28"
                            />
                        </span>
                    </div>

                    <div className="mt-2.5 sm:mt-3">
                        <CinemaFilterBar
                            options={nearbyCinemas.map(({ id, slug, name }) => ({ id, slug, name }))}
                            selectedSlugs={effectiveSelectedCinemaSlugs}
                            onToggle={toggleCinemaFilter}
                            onClear={() => setSelectedCinemaSlugs([])}
                        />
                    </div>

                    <div className="mt-4">
                        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                            <h3 className="inline-flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg md:text-xl">
                                <Film className="h-4 w-4 text-primary" />
                                Filme in deiner Nähe
                            </h3>
                            <span className="text-xs text-muted-foreground">Sortiert nach Beliebtheit</span>
                        </div>

                        <div className="space-y-3">
                            {nearbyMovies.map((movie) => (
                                <MovieCard key={movie.name} movie={movie} />
                            ))}
                        </div>

                        {nearbyMovies.length === 0 && (
                            <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                                In den {isCinemaFilterActive ? "ausgewählten" : "gefundenen"} Kinos sind aktuell keine Filme mit restlichen Vorstellungen verügbar.
                            </p>
                        )}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">Kinos in der Nähe</h3>

                        <div className="mt-3 grid gap-2 sm:gap-3 sm:grid-cols-2">
                            {filteredCinemas.map((cinema) => {
                                const originalCinema = nearbyCinemas.find((c) => c.id === cinema.id);
                                const nextShowing = originalCinema?.movies
                                    .flatMap((movie) => movie.showings)
                                    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime())[0];

                                return (
                                    <article
                                        key={cinema.id}
                                        className="rounded-xl border border-border/70 bg-background/80 p-3 transition-colors hover:bg-background sm:rounded-2xl sm:p-4"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <Link href={`/cinema/${cinema.slug}`} className="text-sm font-semibold tracking-tight hover:underline sm:text-base">
                                                    {cinema.name}
                                                </Link>
                                                {cinema.city && (
                                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground sm:mt-1.5 sm:text-sm">
                                                        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                        <Link href={`/city/${cinema.city.slug}`} className="hover:underline">
                                                            {cinema.city.name}
                                                        </Link>
                                                    </p>
                                                )}
                                            </div>
                                            {cinema.distanceKm != null && (
                                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary sm:px-2.5 sm:py-1 sm:text-xs">
                                                    {formatDistance(cinema.distanceKm)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] sm:mt-3 sm:gap-2 sm:text-xs">
                                            <span className="rounded-full border border-border/80 px-2 py-0.5 text-foreground/80 sm:px-2.5 sm:py-1">
                                                {originalCinema?.movies.length ?? 0} Filme
                                            </span>
                                            <span className="rounded-full border border-border/80 px-2 py-0.5 text-foreground/80 sm:px-2.5 sm:py-1">
                                                {(() => {
                                                    let count = 0;
                                                    if (originalCinema) {
                                                        for (const movie of originalCinema.movies) {
                                                            count += movie.showings.length;
                                                        }
                                                    }
                                                    return count;
                                                })()} Vorstellungen
                                            </span>
                                        </div>

                                        {nextShowing && (
                                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground sm:mt-3 sm:px-2.5 sm:py-1.5 sm:text-xs">
                                                <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                                Nächste Vorstellung um {formatShowingTime(nextShowing.dateTime)}
                                            </p>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {nearbyCinemas.length === 0 && (
                <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    In einem Radius von {appliedRadiusKm} km wurden keine Kinos mit Vorstellungen gefunden.
                </p>
            )}
        </section>
    );
};
