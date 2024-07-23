import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { getDateString } from "@waslaeuftin/helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { serverSideTranslations, useTranslation } from "@waslaeuftin/i18n/i18n";
import { type Locale } from "@waslaeuftin/i18n/settings";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { type Metadata } from "next";
import { Suspense } from "react";

type CinemaPageProps = {
  params: { cinemaSlug?: string; locale: Locale };
  searchParams: { date?: string };
};

export async function generateMetadata({
  params: { cinemaSlug, locale },
  searchParams: { date },
}: CinemaPageProps): Promise<Metadata> {
  const { t } = await serverSideTranslations(locale);

  const notFoundTitle = `${t("appName")} - ${t("error")} 404 - ${t("not.found")}`;
  const notFoundDescription = t("page.not.found");

  if (!cinemaSlug) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  const city = await api.cities.getCityById(cinema.cityId);

  return {
    title: t("what.movies.are.showing.in.cinema.x", {
      cinema: `${cinema.name}${city ? ` in ${city.name}` : ""}`,
    }),
    description: t("find.out.which.movies.are.showing.in.cinema.cta"),
  };
}

export default async function CinemaPage({
  params: { cinemaSlug, locale },
  searchParams: { date },
}: CinemaPageProps) {
  const { t } = await useTranslation(locale);

  if (!cinemaSlug) {
    return <div>{t("not.found")}</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: umlautsFixer(cinemaSlug),
    date: date ? moment(date).toDate() : undefined,
  });

  if (!cinema) {
    return <div>{t("not.found")}</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("whats.showing.date.x.in.cinema.x", {
                date: getDateString(date),
                cinema: cinema?.name,
              })}
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
