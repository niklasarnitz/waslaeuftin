import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { Constants } from "@waslaeuftin/globals/Constants";
import { getDateString } from "@waslaeuftin/helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { type Metadata } from "next";
import { Suspense } from "react";

type CinemaPageProps = {
  params: Promise<{ cinemaSlug?: string }>;
  searchParams: Promise<{ date?: string }>;
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
    title: Constants["what-movies-are-showing-in"].cinema(
      `${cinema.name}${city ? ` in ${city.name}` : ""}`,
    ),
    description: Constants["find-out-which-movies-are-showing-in"].cinema,
  };
}

export default async function CinemaPage({
  params,
  searchParams,
}: CinemaPageProps) {
  const { cinemaSlug } = await params;
  const { date } = await searchParams;

  if (!cinemaSlug) {
    return <div>{Constants["not-found"].page}</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>{Constants["not-found"].page}</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {Constants["whats-showing-in-date"].cinema(
                cinema?.name ?? "",
                getDateString(date),
              )}
            </h1>
            <UrlDatePicker cinemaSlug={cinemaSlug} />
          </div>
        </div>
      </section>
      <section className="py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container">
          <Suspense fallback={<LoadingSpinner />}>
            <CinemaMovies cinema={cinema} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
