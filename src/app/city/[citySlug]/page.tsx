import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { type Metadata } from "next";
import { Constants } from "@waslaeuftin/globals/Constants";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { getPathName } from "@waslaeuftin/helpers/getPathName";
import { safeJsonLd } from "@waslaeuftin/helpers/safeJsonLd";

type MoviesInCityProps = {
  params: Promise<{ citySlug?: string }>;
  searchParams: Promise<{ date?: string; searchQuery?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: MoviesInCityProps): Promise<Metadata> {
  const { citySlug } = await params;
  const { date } = await searchParams;

  const notFoundTitle = `${Constants.appName} - ${Constants.error} 404 - ${Constants["not-found"].page}`;

  if (!citySlug) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return {
      title: notFoundTitle,
      description: Constants["not-found"].page,
    };
  }

  return {
    title: `${Constants["what-movies-are-showing-soon-in"].city(city.name)} | ${Constants.appName}`,
    description: Constants["what-movies-are-showing-soon-in"].cta.city(
      city.name,
    ),
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
    return <div>{Constants["not-found"].page}</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: decodedParams.date ? moment(decodedParams.date).toDate() : undefined,
  });

  if (!city) {
    return <div>{Constants["not-found"].page}</div>;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": city.cinemas.map((cinema, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "MovieTheater",
        "name": cinema.name,
        "url": `https://waslaeuft.in/cinema/${cinema.slug}`,
      }
    }))
  };

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
          <MoviesByCinemaList city={city} date={decodedParams.date} />
        </section>
      </main>
    </SiteWrapper>
  );
}
