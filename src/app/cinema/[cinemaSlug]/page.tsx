import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { getDateString } from "@waslaeuftin/helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { type Metadata } from "next";
import { Suspense } from "react";

type CinemaPageProps = {
  params: { cinemaSlug?: string };
  searchParams: { date?: string };
};

export async function generateMetadata({
  params: { cinemaSlug },
  searchParams: { date },
}: CinemaPageProps): Promise<Metadata> {
  if (!cinemaSlug) {
    return {
      title: "wasläuft.in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return {
      title: "wasläuft.in - 404",
      description: "Diese Seite konnte nicht gefunden werden.",
    };
  }

  const city = await api.cities.getCityById(cinema.cityId);

  return {
    title: `Welche Filme laufen im ${cinema.name}${city ? ` in ${city.name}` : ""}`,
    description:
      "Finde jetzt heraus, welche Filme heute in deinem Kino laufen.",
  };
}

export default async function CinemaPage({
  params: { cinemaSlug },
  searchParams: { date },
}: CinemaPageProps) {
  if (!cinemaSlug) {
    return <div>Not found</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>Not found</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
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
