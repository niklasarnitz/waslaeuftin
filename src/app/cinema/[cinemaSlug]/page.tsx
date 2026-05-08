import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { Constants } from "@waslaeuftin/globals/Constants";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { type Metadata } from "next";
import { safeJsonLd } from "@waslaeuftin/helpers/safeJsonLd";

type CinemaPageProps = {
  params: Promise<{ cinemaSlug?: string }>;
  searchParams: Promise<{ date?: string; searchQuery?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CinemaPageProps): Promise<Metadata> {
  const { cinemaSlug } = await params;
  const { date } = await searchParams;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;

  if (!cinemaSlug) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  const city = await api.cities.getCityById(cinema.cityId);

  return {
    title: `${Constants["what-movies-are-showing-in"].cinema(
      `${cinema.name}${city ? ` in ${city.name}` : ""}`,
    )} | ${Constants.appName}`,
    description: Constants["find-out-which-movies-are-showing-in"].cinema,
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
    return <div>{Constants["not-found"].page}</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: decodedParams.date ? moment(decodedParams.date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>{Constants["not-found"].page}</div>;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MovieTheater",
    name: cinema.name,
    url: `https://waslaeuft.in/cinema/${cinema.slug}`,
    event: cinema.movies.flatMap((movie) =>
      movie.showings.map((showing) => ({
        "@type": "ScreeningEvent",
        name: movie.name,
        startDate: showing.dateTime,
        url: showing.bookingUrl || `https://waslaeuft.in/cinema/${cinema.slug}`,
        location: {
          "@type": "MovieTheater",
          name: cinema.name,
        },
        workPresented: {
          "@type": "Movie",
          name: movie.name,
        }
      }))
    ),
  };

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <CinemaMovies cinema={cinema} />
        </section>
      </main>
    </SiteWrapper>
  );
}
