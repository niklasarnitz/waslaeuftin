import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { ProgrammeBreadcrumbs } from "@waslaeuftin/components/ProgrammeBreadcrumbs";
import { ProgrammeFreshness } from "@waslaeuftin/components/ProgrammeFreshness";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { JsonLd } from "@waslaeuftin/components/StructuredData/JsonLd";
import { Constants } from "@waslaeuftin/globals/Constants";
import { compactCinemaProgramme } from "@waslaeuftin/helpers/compactMovieProgramme";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { nextCinemaShowing } from "@waslaeuftin/helpers/nextShowing";
import {
  mapUrl,
  programmeProviders,
  programmeTitle,
  ticketSource,
} from "@waslaeuftin/helpers/programme";
import {
  cinemaAlternatives,
  cinemaProgramme,
} from "@waslaeuftin/helpers/programmeData";
import {
  programmeBreadcrumbs,
  theaterData,
} from "@waslaeuftin/helpers/programmeStructuredData";
import {
  listingMetadata,
  listingPath,
  SITE_URL,
} from "@waslaeuftin/helpers/seo";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";

type CinemaPageProps = {
  params: Promise<{ cinemaSlug?: string }>;
  searchParams: Promise<{ date?: string; searchQuery?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CinemaPageProps): Promise<Metadata> {
  const { cinemaSlug } = await params;
  const query = await searchParams;
  const { date } = query;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;

  if (!cinemaSlug) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
      robots: { index: false, follow: true },
    };
  }

  const cinema = await cinemaProgramme(umlautsFixer(cinemaSlug), date);

  if (!cinema) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
      robots: { index: false, follow: true },
    };
  }

  const city = cinema.city;

  const nextShowing = await nextCinemaShowing(cinema.id);

  return {
    ...listingMetadata(
      listingPath("cinema", cinema.slug),
      !!nextShowing,
      query,
    ),
    title: programmeTitle(`${cinema.name} in ${city.name}`, date),
    description: `Kinoprogramm im ${cinema.name}${city ? ` in ${city.name}` : ""}: Filme, Spielzeiten und Tickets für deinen Kinobesuch.`,
  };
}

export default async function CinemaPage({
  params,
  searchParams,
}: CinemaPageProps) {
  const { cinemaSlug } = await params;
  const decodedParams = await searchParams;
  const pathname = await getPathName();

  if (!cinemaSlug) {
    notFound();
  }

  const cinema = await cinemaProgramme(
    umlautsFixer(cinemaSlug),
    decodedParams.date,
  );

  if (!cinema) {
    notFound();
  }

  const [nextShowing, alternatives] = await Promise.all([
    nextCinemaShowing(cinema.id),
    cinemaAlternatives(cinema.cityId, cinema.id),
  ]);
  const source = ticketSource(
    cinema.movies
      .flatMap((movie) => movie.showings)
      .find((showing) => showing.bookingUrl)?.bookingUrl ??
      nextShowing?.bookingUrl,
  );
  const theater = theaterData(cinema, cinema.city);
  const providers = programmeProviders(cinema);

  const jsonLd = {
    "@context": "https://schema.org",
    ...theater,
    event: cinema.movies.flatMap((movie) =>
      movie.showings
        .filter((showing) => showing.dateTime >= new Date())
        .map((showing) => ({
          "@type": "ScreeningEvent",
          name: movie.name,
          startDate: showing.dateTime.toISOString(),
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          url:
            showing.bookingUrl ||
            `${SITE_URL}${listingPath("cinema", cinema.slug)}`,
          location: theater,
          workPresented: {
            "@type": "Movie",
            name: movie.name,
            ...(movie.coverUrl ? { image: movie.coverUrl } : {}),
          },
        })),
    ),
  };

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <JsonLd data={jsonLd} />
      <JsonLd data={programmeBreadcrumbs(cinema.city, cinema)} />
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <ProgrammeBreadcrumbs city={cinema.city} cinema={cinema} />
          <CinemaMovies
            cinema={compactCinemaProgramme(cinema)}
            date={decodedParams.date}
          />
          <details className="border-border/60 mt-6 border-t pt-4">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
              Über das Kino und dieses Programm
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <ProgrammeFreshness updated={cinema.lastFetchedAt} />
              {providers.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Programmanbieter: {providers.join(", ")}
                </p>
              )}
              <p className="text-sm">
                <a
                  href={mapUrl(cinema)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Kino auf der Karte anzeigen
                </a>
                {source && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Ticketquelle: {source.name}
                    </a>
                  </>
                )}
              </p>
              {alternatives.length > 0 && (
                <nav
                  aria-label="Weitere Kinos in dieser Stadt"
                  className="text-muted-foreground flex flex-wrap gap-3 text-xs"
                >
                  <span>Weitere Kinos in {cinema.city.name}:</span>
                  {alternatives.map((other) => (
                    <Link
                      key={other.id}
                      href={listingPath("cinema", other.slug)}
                      className="underline"
                    >
                      {other.name}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
          </details>
        </section>
      </main>
    </SiteWrapper>
  );
}
