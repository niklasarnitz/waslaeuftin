import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { Suspense } from "react";
import { getDateString } from "../../../helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { type Metadata } from "next";
import { Constants } from "@waslaeuftin/globals/Constants";

type MoviesInCityProps = {
  params: { citySlug?: string };
  searchParams: { date?: string };
};

export async function generateMetadata({
  params: { citySlug },
  searchParams: { date },
}: MoviesInCityProps): Promise<Metadata> {
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
    title: Constants["what-movies-are-showing-soon-in"].city(city.name),
    description: Constants["what-movies-are-showing-soon-in"].cta.city(
      city.name,
    ),
  };
}

export default async function MoviesInCity({
  params: { citySlug },
  searchParams: { date },
}: MoviesInCityProps) {
  if (!citySlug) {
    return <div>{Constants["not-found"].page}</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return <div>{Constants["not-found"].page}</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {Constants["whats-showing-in-date"].city(
                city.name,
                getDateString(date),
              )}
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
