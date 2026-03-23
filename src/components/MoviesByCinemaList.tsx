"use client";

import { MovieCover } from "@waslaeuftin/components/MovieCover";
import { ShowingTags } from "@waslaeuftin/components/ShowingTags";
import { type api } from "@waslaeuftin/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@waslaeuftin/components/ui/accordion";
import { normalizeMovieTitle } from "@waslaeuftin/helpers/movieTitleNormalizer";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import moment from "moment-timezone";
import { useMemo } from "react";

type CityMoviesAndShowings = NonNullable<
  Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
>;

type CityCinema = CityMoviesAndShowings["cinemas"][number];
type CinemaMovie = CityCinema["movies"][number];
type MovieShowing = CinemaMovie["showings"][number];

type ShowingWithTags = MovieShowing & {
  tags: string[];
  rawMovieName: string;
};

export const MoviesByCinemaList = ({
  city,
  date,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>;
  date?: string;
}) => {
  const groupedMovies = useMemo(() => {
    if (!city) {
      return [];
    }

    const groupedMoviesMap = new Map<
      string,
      {
        name: string;
        coverUrl: string | null;
        cinemas: Array<{
          cinema: CityCinema;
          showings: ShowingWithTags[];
          nextShowing: MovieShowing | undefined;
        }>;
        showingsCount: number;
        nextShowing: MovieShowing | undefined;
      }
    >();

    const now = new Date();

    city.cinemas.forEach((cinema) => {
      cinema.movies.forEach((movie) => {
        const showingsWithTags: ShowingWithTags[] = movie.showings
          .filter((showing) => showing.dateTime.getTime() > now.getTime())
          .map((showing) => {
            const { tags } = normalizeMovieTitle(showing.rawMovieName);
            return { ...showing, tags, rawMovieName: showing.rawMovieName };
          });

        if (showingsWithTags.length === 0) {
          return;
        }

        const nextShowing = showingsWithTags[0];
        const existingMovie = groupedMoviesMap.get(movie.name);

        if (!existingMovie) {
          groupedMoviesMap.set(movie.name, {
            name: movie.name,
            coverUrl: movie.coverUrl,
            cinemas: [
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

        existingMovie.cinemas.push({
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

    return Array.from(groupedMoviesMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [city]);

  const [expandedMovies, setExpandedMovies] = useQueryState(
    "expandedMovies",
    {
      ...parseAsArrayOf(parseAsString).withDefault(
        groupedMovies.map((movie) => movie.name),
      ),
    },
  );

  if (!city) {
    return null;
  }

  if (groupedMovies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        Für den ausgewählten Tag wurden keine Vorstellungen gefunden.
      </div>
    );
  }

  return (
    <Accordion
      type="multiple"
      value={expandedMovies ?? []}
      onValueChange={setExpandedMovies}
      className="space-y-3"
    >
      {groupedMovies.map((movie) => {
        const sortedCinemas = [...movie.cinemas].sort((left, right) => {
          const leftTime = left.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;
          const rightTime = right.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;

          if (leftTime === rightTime) {
            return left.cinema.name.localeCompare(right.cinema.name);
          }

          return leftTime - rightTime;
        });

        return (
          <AccordionItem
            key={movie.name}
            value={movie.name}
            className="rounded-xl border border-border/80 bg-card px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full flex-col items-start gap-2 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-start gap-3">
                  <MovieCover
                    title={movie.name}
                    coverUrl={movie.coverUrl}
                    className="w-14 shrink-0"
                  />
                  <h2 className="text-left text-xl font-bold tracking-tight sm:text-2xl">
                    {movie.name}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                  <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                    {movie.cinemas.length} {movie.cinemas.length === 1 ? "Kino" : "Kinos"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 font-medium">
                    {movie.showingsCount} Vorstellungen
                  </span>
                  {movie.nextShowing && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-1 font-medium">
                      <Clock3 className="h-3.5 w-3.5" />
                      Nächste: {moment(movie.nextShowing.dateTime).format("HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-y-4">
              {sortedCinemas.map((cinemaEntry) => (
                <section
                  key={`${movie.name}-${cinemaEntry.cinema.slug}`}
                  className="rounded-xl border border-border/70 bg-card/60 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <Link
                      href={`/cinema/${cinemaEntry.cinema.slug}${date ? `?date=${date}` : ""}`}
                      className="text-lg font-semibold tracking-tight hover:underline"
                    >
                      {cinemaEntry.cinema.name}
                    </Link>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {cinemaEntry.showings.length} Termine
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-x-visible">
                    {cinemaEntry.showings.map((showing) => (
                      <Link
                        key={`${movie.name}-${cinemaEntry.cinema.slug}-${showing.id}-${showing.dateTime.toISOString()}`}
                        href={showing.bookingUrl ?? "#"}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{moment(showing.dateTime).format("HH:mm")}</span>
                        <ShowingTags
                          titleTags={showing.tags}
                          additionalData={showing.showingAdditionalData}
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
