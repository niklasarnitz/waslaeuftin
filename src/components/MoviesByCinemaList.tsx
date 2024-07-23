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
import { type Locale } from "@waslaeuftin/i18n/settings";

export const MoviesByCinemaList = ({
  city,
  date,
  locale,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>;
  date?: string;
  locale: Locale;
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
    <Accordion
      type="multiple"
      value={expandedCinemas ?? []}
      onValueChange={setExpandedCinemas}
    >
      {city.cinemas.map((cinema) => {
        return (
          <AccordionItem key={cinema.slug} value={cinema.slug}>
            <AccordionTrigger>
              <Link
                href={`/${locale}/cinema/${cinema.slug}${date ? `?date=${date}` : ""}`}
              >
                <h1 className="text-3xl font-bold">{cinema.name}</h1>
              </Link>
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
