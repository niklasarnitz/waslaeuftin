import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { Suspense } from "react";
import { getDateString } from "../../../helpers/getDateString";

export default async function MoviesInCity({
  params: { citySlug },
  searchParams: { date },
}: {
  params: { citySlug?: string };
  searchParams: { date?: string };
}) {
  if (!citySlug) {
    return <div>Not found</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: citySlug,
    date: date ? moment(date).toDate() : undefined,
  });

  if (!city) {
    return <div>Not found</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-row items-start justify-between gap-x-2 pt-4">
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
            <MoviesByCinemaList city={city} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
