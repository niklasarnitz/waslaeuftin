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

export const MoviesByCinemaList = ({
  city,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>;
}) => {
  const [expandedCinemas, setExpandedCinemas] = useQueryState(
    "expandedCinemas",
    parseAsArrayOf(parseAsString).withDefault(
      city?.cinemas.map((cinema) => cinema.slug) ?? [],
    ),
  );

  if (!city) {
    return null;
  }

  return (
    <Accordion
      type="multiple"
      className="px-4"
      value={expandedCinemas ?? []}
      onValueChange={setExpandedCinemas}
    >
      {city.cinemas.map((cinema) => {
        return (
          <AccordionItem key={cinema.slug} value={cinema.slug}>
            <AccordionTrigger>
              <Link href={`/cinema/${cinema.slug}`}>
                <h1 className="text-xl font-bold">{cinema.name}</h1>
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
