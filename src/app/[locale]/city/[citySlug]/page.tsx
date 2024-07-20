import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { Suspense } from "react";
import { getDateString } from "../../../../helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { type Metadata } from "next";
import { useTranslation } from "@waslaeuftin/i18n/i18n";
import { type Locale } from "@waslaeuftin/i18n/settings";

type MoviesInCityProps = {
  params: { citySlug?: string; locale: Locale };
  searchParams: { date?: string };
};

export async function generateMetadata({
  params: { citySlug, locale },
  searchParams: { date },
}: MoviesInCityProps): Promise<Metadata> {
  if (!citySlug) {
    return {
      title: "wasäuft․in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return {
      title: "wasäuft․in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  return {
    title: `Welche Filme laufen in demnächst in ${city.name}`,
    description: `Finde jetzt heraus, welche Filme demnächst in ${city.name} laufen.`,
  };
}

export default async function MoviesInCity({
  params: { citySlug, locale },
  searchParams: { date },
}: MoviesInCityProps) {
  if (!citySlug) {
    return <div>Not found</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return <div>Not found</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Was läuft {getDateString(date)} in {city.name}
            </h1>
            <UrlDatePicker citySlug={citySlug} />
          </div>
        </div>
      </section>
      <section className="py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container">
          <Suspense fallback={<LoadingSpinner />}>
            <MoviesByCinemaList city={city} date={date} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
