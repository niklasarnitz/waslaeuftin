"use client";

import { type api } from "@waslaeuftin/trpc/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@waslaeuftin/components/ui/accordion";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import moment from "moment-timezone";

export const MoviesByCinemaList = ({
  city,
  date,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>;
  date?: string;
}) => {
  const [expandedCinemas, setExpandedCinemas] = useQueryState(
    "expandedCinemas",
    {
      ...parseAsArrayOf(parseAsString).withDefault(
        city?.cinemas.map((cinema) => cinema.slug) ?? [],
      ),
    },
  );

  if (!city) {
    return null;
  }

  return (
    <Accordion type="multiple" value={expandedCinemas ?? []} onValueChange={setExpandedCinemas} className="space-y-3">
      {city.cinemas.map((cinema) => {
        const showingsCount = cinema.movies.reduce(
          (total, movie) => total + movie.showings.length,
          0,
        );

        const nextShowing = cinema.movies
          .flatMap((movie) => movie.showings)
          .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0];

        return (
          <AccordionItem
            key={cinema.slug}
            value={cinema.slug}
            className="rounded-xl border border-border/80 bg-card px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full flex-col items-start gap-2 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <Link
                  href={`/cinema/${cinema.slug}${date ? `?date=${date}` : ""}`}
                  className="text-left"
                >
                  <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {cinema.name}
                  </h2>
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                  <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                    {cinema.movies.length} Filme
                  </span>
                  <span className="rounded-full bg-muted px-2 py-1 font-medium">
                    {showingsCount} Vorstellungen
                  </span>
                  {nextShowing && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-1 font-medium">
                      <Clock3 className="h-3.5 w-3.5" />
                      Nächste: {moment(nextShowing.dateTime).format("HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-y-4">
              <CinemaMovies cinema={cinema} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
