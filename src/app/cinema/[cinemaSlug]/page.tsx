import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { getDateString } from "@waslaeuftin/helpers/getDateString";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { Suspense } from "react";

export default async function CinemaPage({
  params: { cinemaSlug },
  searchParams: { date },
}: {
  params: { cinemaSlug?: string };
  searchParams: { date?: string };
}) {
  if (!cinemaSlug) {
    return <div>Not found</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: cinemaSlug,
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>Not found</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-row items-start justify-between gap-x-2 pt-4">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Was läuft {getDateString(date)} im {cinema?.name}
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
