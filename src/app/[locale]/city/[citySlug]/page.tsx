import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { UrlDatePicker } from "@waslaeuftin/components/UrlDatePicker";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import { Suspense } from "react";
import { getDateString } from "../../../../helpers/getDateString";
import { umlautsFixer } from "@waslaeuftin/helpers/umlautsFixer";
import { type Metadata } from "next";
import { type Locale } from "@waslaeuftin/i18n/settings";
import { serverSideTranslations, useTranslation } from "@waslaeuftin/i18n/i18n";

type MoviesInCityProps = {
  params: { citySlug?: string; locale: Locale };
  searchParams: { date?: string };
};

export async function generateMetadata({
  params: { citySlug, locale },
  searchParams: { date },
}: MoviesInCityProps): Promise<Metadata> {
  const { t } = await serverSideTranslations(locale);

  const notFoundTitle = `${t("appName")} - ${t("error")} 404 - ${t("not.found")}`;
  const notFoundDescription = t("page.not.found");

  if (!citySlug) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
    locale,
  });

  if (!city) {
    return {
      title: notFoundTitle,
      description: notFoundDescription,
    };
  }

  return {
    title: t("what.movies.are.showing.soon.in.x", {
      city: city.name,
    }),
    description: t("what.movies.are.showing.soon.in.x-cta", {
      city: city.name,
    }),
  };
}

export default async function MoviesInCity({
  params: { citySlug, locale },
  searchParams: { date },
}: MoviesInCityProps) {
  const { t } = await useTranslation(locale);

  if (!citySlug) {
    return <div>{t("not.found")}</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: umlautsFixer(citySlug),
    date: date ? moment(date).toDate() : undefined,
    locale,
  });

  if (!city) {
    return <div>{t("not.found")}</div>;
  }

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-x-2 gap-y-4 pt-4 md:flex-row">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("whats.showing.date.x.in.city.x", {
                date: getDateString(date),
                city: city.name,
              })}
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
