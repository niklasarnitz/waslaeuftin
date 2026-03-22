"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Compass, Film, Loader2, MapPin, Navigation, Ticket } from "lucide-react";

import { MovieCover } from "@waslaeuftin/components/MovieCover";
import { ShowingTags } from "@waslaeuftin/components/ShowingTags";
import { normalizeMovieTitle } from "@waslaeuftin/helpers/movieTitleNormalizer";
import { api } from "@waslaeuftin/trpc/react";

type Coordinates = {
    latitude: number;
    longitude: number;
};

const DEFAULT_RADIUS_KM = 20;
const MIN_RADIUS_KM = 5;
const MAX_RADIUS_KM = 100;
const RADIUS_STORAGE_KEY = "nearbyRadiusKm";

const formatDistance = (distanceKm: number) => {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(1)} km`;
};

const formatTime = (value: Date) => {
    return value.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const NearbyCinemasSection = () => {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [selectedCinemaSlugs, setSelectedCinemaSlugs] = useState<string[]>([]);
    const [radiusKm, setRadiusKm] = useState(() => {
        if (typeof window === "undefined") {
            return DEFAULT_RADIUS_KM;
        }

        const storedValue = window.localStorage.getItem(RADIUS_STORAGE_KEY);

        if (!storedValue) {
            return DEFAULT_RADIUS_KM;
        }

        const parsedValue = Number(storedValue);

        if (
            Number.isFinite(parsedValue) &&
            parsedValue >= MIN_RADIUS_KM &&
            parsedValue <= MAX_RADIUS_KM
        ) {
            return parsedValue;
        }

        return DEFAULT_RADIUS_KM;
    });
    const hasRequestedLocation = useRef(false);

    useEffect(() => {
        window.localStorage.setItem(RADIUS_STORAGE_KEY, String(radiusKm));
    }, [radiusKm]);

    const nearbyQuery = api.cinemas.getNearbyCinemas.useQuery(
        {
            latitude: coordinates?.latitude ?? 0,
            longitude: coordinates?.longitude ?? 0,
            maxDistanceKm: radiusKm,
            limit: 6,
        },
        {
            enabled: Boolean(coordinates),
            refetchOnWindowFocus: false,
        },
    );

    type NearbyCinema = NonNullable<typeof nearbyQuery.data>[number];
    type NearbyShowing = NearbyCinema["movies"][number]["showings"][number];
    type NearbyShowingWithTags = NearbyShowing & { tags: string[] };

    const nearbyCinemas = useMemo(() => nearbyQuery.data ?? [], [nearbyQuery.data]);

    const effectiveSelectedCinemaSlugs = useMemo(() => {
        if (selectedCinemaSlugs.length === 0) {
            return [];
        }

        const availableCinemaSlugs = new Set(nearbyCinemas.map((cinema) => cinema.slug));

        return selectedCinemaSlugs.filter((selectedCinemaSlug) =>
            availableCinemaSlugs.has(selectedCinemaSlug),
        );
    }, [nearbyCinemas, selectedCinemaSlugs]);

    const filteredNearbyCinemas = useMemo(() => {
        if (effectiveSelectedCinemaSlugs.length === 0) {
            return nearbyCinemas;
        }

        const selectedCinemaSlugsSet = new Set(effectiveSelectedCinemaSlugs);

        return nearbyCinemas.filter((cinema) => selectedCinemaSlugsSet.has(cinema.slug));
    }, [effectiveSelectedCinemaSlugs, nearbyCinemas]);

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

    const totalShowings = useMemo(() => {
        if (filteredNearbyCinemas.length === 0) {
            return 0;
        }

        return filteredNearbyCinemas.reduce((total, cinema) => {
            return (
                total +
                cinema.movies.reduce((movieTotal, movie) => {
                    return movieTotal + movie.showings.length;
                }, 0)
            );
        }, 0);
    }, [filteredNearbyCinemas]);

    const nearbyMovies = useMemo(() => {
        if (filteredNearbyCinemas.length === 0) {
            return [];
        }

        const groupedMoviesMap = new Map<
            string,
            {
                name: string;
                coverUrl: string | null;
                cinemaEntries: Array<{
                    cinema: NearbyCinema;
                    showings: NearbyShowingWithTags[];
                    nextShowing: NearbyShowing | undefined;
                }>;
                showingsCount: number;
                nextShowing: NearbyShowing | undefined;
            }
        >();

        const now = new Date();

        filteredNearbyCinemas.forEach((cinema) => {
            cinema.movies.forEach((movie) => {
                const { baseTitle, tags } = normalizeMovieTitle(movie.name);
                const showingsWithTags: NearbyShowingWithTags[] = movie.showings
                    .filter((showing) => showing.dateTime.getTime() > now.getTime())
                    .map((showing) => ({ ...showing, tags }));

                if (showingsWithTags.length === 0) {
                    return;
                }

                const nextShowing = showingsWithTags[0];
                const existingMovie = groupedMoviesMap.get(baseTitle);

                if (!existingMovie) {
                    groupedMoviesMap.set(baseTitle, {
                        name: baseTitle,
                        coverUrl: movie.coverUrl,
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
                    nextShowing &&
                    (!existingMovie.nextShowing ||
                        nextShowing.dateTime.getTime() <
                        existingMovie.nextShowing.dateTime.getTime())
                ) {
                    existingMovie.nextShowing = nextShowing;
                }
            });
        });

        return Array.from(groupedMoviesMap.values())
            .filter((movie) => Boolean(movie.nextShowing))
            .sort((left, right) => left.name.localeCompare(right.name))
            .slice(0, 18);
    }, [filteredNearbyCinemas]);

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

        // Trigger asynchronously to satisfy strict hook linting on state updates in effects.
        const timeoutId = window.setTimeout(() => {
            requestLocation();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    return (
        <section className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-slate-50/90 via-background to-cyan-50/70 p-5 shadow-sm md:p-8 dark:from-slate-950/60 dark:to-slate-900/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/75">
                        <Navigation className="h-3.5 w-3.5" />
                        In meiner Nähe
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Kinos rund um deinen Standort</h2>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                        Diese Filme laufen heute in deiner Nähe. Der Radius ist standardmaessig 20 km und frei anpassbar.
                    </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 md:items-end">
                    <label
                        htmlFor="nearby-radius"
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/70"
                    >
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
                        className="w-[220px] accent-primary"
                    />
                    <button
                        type="button"
                        onClick={requestLocation}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                    >
                        <Compass className="h-4 w-4" />
                        Standort erneut abfragen
                    </button>
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
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1">
                            {nearbyMovies.length} Filme in der Nähe
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1">
                            {filteredNearbyCinemas.length}{" "}
                            {filteredNearbyCinemas.length === 1 ? "Kino" : "Kinos"}{" "}
                            {isCinemaFilterActive ? "ausgewählt" : "gefunden"}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1">
                            {totalShowings} Vorstellungen heute
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/60">
                            Nach Kino filtern
                        </span>
                        {nearbyCinemas.map((cinema) => {
                            const isSelected = effectiveSelectedCinemaSlugs.includes(cinema.slug);

                            return (
                                <button
                                    key={cinema.id}
                                    type="button"
                                    onClick={() => toggleCinemaFilter(cinema.slug)}
                                    aria-pressed={isSelected}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border/80 bg-background/80 text-foreground hover:border-primary/50"
                                    }`}
                                >
                                    {cinema.name}
                                </button>
                            );
                        })}
                        {isCinemaFilterActive && (
                            <button
                                type="button"
                                onClick={() => setSelectedCinemaSlugs([])}
                                className="rounded-full border border-border/80 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4 md:p-5">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h3 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight md:text-xl">
                                <Film className="h-4 w-4 text-primary" />
                                Diese Filme laufen heute in deiner Nähe
                            </h3>
                            <span className="text-xs text-muted-foreground">Sortiert nach nächster Uhrzeit</span>
                        </div>

                        <div className="space-y-3">
                            {nearbyMovies.map((movie) => {
                                const sortedCinemas = [...movie.cinemaEntries].sort((left, right) => {
                                    const leftTime = left.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;
                                    const rightTime = right.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;

                                    if (leftTime === rightTime) {
                                        return left.cinema.name.localeCompare(right.cinema.name);
                                    }

                                    return leftTime - rightTime;
                                });

                                return (
                                    <article
                                        key={movie.name}
                                        className="rounded-2xl border border-border/70 bg-background/85 p-4 transition-colors hover:bg-background md:p-5"
                                    >
                                        <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
                                            <div className="mx-auto w-full max-w-[140px] md:mx-0">
                                                <MovieCover
                                                    title={movie.name}
                                                    coverUrl={movie.coverUrl}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <h4 className="line-clamp-2 text-xl font-bold tracking-tight sm:text-2xl">
                                                        {movie.name}
                                                    </h4>
                                                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                        {movie.cinemaEntries.length}{" "}
                                                        {movie.cinemaEntries.length === 1 ? "Kino" : "Kinos"}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1">
                                                        {movie.showingsCount} Vorstellungen heute
                                                    </span>
                                                    {movie.nextShowing && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2.5 py-1">
                                                            <Clock3 className="h-3.5 w-3.5" />
                                                            Nächste um {formatTime(movie.nextShowing.dateTime)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {sortedCinemas.map((cinemaEntry) => (
                                                        <div key={`${movie.name}-${cinemaEntry.cinema.id}`} className="rounded-xl border border-border/70 bg-background/70 p-3">
                                                            <div className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                <Link href={`/cinema/${cinemaEntry.cinema.slug}`} className="font-medium hover:underline">
                                                                    {cinemaEntry.cinema.name}
                                                                </Link>
                                                                <span className="text-foreground/40">•</span>
                                                                <Link href={`/city/${cinemaEntry.cinema.city.slug}`} className="hover:underline">
                                                                    {cinemaEntry.cinema.city.name}
                                                                </Link>
                                                                <span className="text-foreground/40">•</span>
                                                                <span>{formatDistance(cinemaEntry.cinema.distanceKm)}</span>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                {cinemaEntry.showings.slice(0, 5).map((showing) => (
                                                                     <Link
                                                                         key={`${movie.name}-${cinemaEntry.cinema.slug}-${showing.id}-${showing.dateTime.toISOString()}`}
                                                                         href={showing.bookingUrl ?? "#"}
                                                                         className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                                                                     >
                                                                         <Clock3 className="h-3 w-3" />
                                                                         <span>{formatTime(showing.dateTime)}</span>
                                                                         <ShowingTags
                                                                             titleTags={showing.tags}
                                                                             additionalData={showing.showingAdditionalData}
                                                                         />
                                                                     </Link>
                                                                 ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {nearbyMovies.length === 0 && (
                            <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                                In den {isCinemaFilterActive ? "ausgewählten" : "gefundenen"} Kinos sind aktuell keine Filme mit restlichen Vorstellungen verfuegbar.
                            </p>
                        )}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">Kinos in der Nähe</h3>

                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            {filteredNearbyCinemas.map((cinema) => {
                                const nextShowing = cinema.movies
                                    .flatMap((movie) => movie.showings)
                                    .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime())[0];

                                return (
                                    <article
                                        key={cinema.id}
                                        className="rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:bg-background"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <Link href={`/cinema/${cinema.slug}`} className="text-base font-semibold tracking-tight hover:underline">
                                                    {cinema.name}
                                                </Link>
                                                <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <Link href={`/city/${cinema.city.slug}`} className="hover:underline">
                                                        {cinema.city.name}
                                                    </Link>
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                                {formatDistance(cinema.distanceKm)}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="rounded-full border border-border/80 px-2.5 py-1 text-foreground/80">
                                                {cinema.movies.length} Filme
                                            </span>
                                            <span className="rounded-full border border-border/80 px-2.5 py-1 text-foreground/80">
                                                {cinema.movies.reduce((total, movie) => total + movie.showings.length, 0)} Vorstellungen
                                            </span>
                                        </div>

                                        {nextShowing && (
                                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                                                <Ticket className="h-3.5 w-3.5" />
                                                Nächste Vorstellung um {formatTime(nextShowing.dateTime)}
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
                    In einem Radius von {radiusKm} km wurden keine Kinos mit Vorstellungen fuer heute gefunden.
                </p>
            )}
        </section>
    );
};
