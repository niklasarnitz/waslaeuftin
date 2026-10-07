import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { ProgrammeBreadcrumbs } from "@waslaeuftin/components/ProgrammeBreadcrumbs";
import { ProgrammeFreshness } from "@waslaeuftin/components/ProgrammeFreshness";
import { ProgrammeHighlights } from "@waslaeuftin/components/ProgrammeHighlights";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { JsonLd } from "@waslaeuftin/components/StructuredData/JsonLd";
import { Constants } from "@waslaeuftin/globals/Constants";
import { compactCityProgramme } from "@waslaeuftin/helpers/compactCityProgramme";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { nextCityShowing } from "@waslaeuftin/helpers/nextShowing";
import { mapUrl, programmeTitle } from "@waslaeuftin/helpers/programme";
import {
  cityHighlights,
  cityProgramme,
} from "@waslaeuftin/helpers/programmeData";
import {
  programmeBreadcrumbs,
  theaterData,
} from "@waslaeuftin/helpers/programmeStructuredData";
import { listingMetadata, listingPath } from "@waslaeuftin/helpers/seo";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";

type MoviesInCityProps = {
  params: Promise<{ citySlug?: string }>;
  searchParams: Promise<{ date?: string; searchQuery?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: MoviesInCityProps): Promise<Metadata> {
  const { citySlug } = await params;
  const query = await searchParams;
  const { date } = query;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;

  if (!citySlug) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
      robots: { index: false, follow: true },
    };
  }

  const city = await cityProgramme(umlautsFixer(citySlug), date);

  if (!city) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
      robots: { index: false, follow: true },
    };
  }

  const nextShowing = await nextCityShowing(city.id);

  return {
    ...listingMetadata(listingPath("city", city.slug), !!nextShowing, query),
    title: programmeTitle(city.name, date),
    description: `Vergleiche Filme und Spielzeiten in ${city.cinemas.length} Kinos in ${city.name}. Entdecke Abendvorstellungen, Originalfassungen und das kommende Programm mit Ticketlinks.`,
  };
}

export default async function MoviesInCity({
  params,
  searchParams,
}: MoviesInCityProps) {
  const { citySlug } = await params;
  const decodedParams = await searchParams;

  const pathname = await getPathName();

  if (!citySlug) {
    notFound();
  }

  const city = await cityProgramme(umlautsFixer(citySlug), decodedParams.date);

  if (!city) {
    notFound();
  }

  const highlights = await cityHighlights(city.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: city.cinemas.map((cinema, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: theaterData(cinema, city),
    })),
  };

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <JsonLd data={jsonLd} />
      <JsonLd data={programmeBreadcrumbs(city)} />
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <ProgrammeBreadcrumbs city={city} />
          <MoviesByCinemaList
            city={compactCityProgramme(city)}
            date={decodedParams.date}
          />
          <ProgrammeHighlights city={city.name} highlights={highlights} />
          <details className="border-border/60 mt-4 border-t pt-4">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
              Kinos und Programmstand ({city.cinemas.length})
            </summary>
            <nav
              aria-label="Kinos in dieser Stadt"
              className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"
            >
              {city.cinemas.map((cinema) => (
                <div key={cinema.id} className="flex flex-col gap-1">
                  <Link
                    href={listingPath("cinema", cinema.slug)}
                    className="underline"
                  >
                    {cinema.name}
                  </Link>
                  <a
                    href={mapUrl({ ...cinema, city })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-xs underline"
                  >
                    Karte
                  </a>
                  <ProgrammeFreshness updated={cinema.lastFetchedAt} />
                </div>
              ))}
            </nav>
          </details>
        </section>
      </main>
    </SiteWrapper>
  );
}
