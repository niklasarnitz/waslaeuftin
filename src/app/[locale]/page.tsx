import Link from "next/link";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { cookies } from "next/headers";
import { api } from "@waslaeuftin/trpc/server";
import { CityRow } from "@waslaeuftin/components/CityRow";
import { type Metadata } from "next";
import { type Locale } from "@waslaeuftin/i18n/settings";
import { serverSideTranslations, useTranslation } from "@waslaeuftin/i18n/i18n";
import { type TFunction } from "i18next";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: {
    searchQuery?: string;
  };
  params: {
    locale: Locale;
  };
};

export async function generateMetadata({
  params,
}: HomeProps): Promise<Metadata> {
  const { t } = await serverSideTranslations(params.locale);

  return {
    title: t("appName"),
    description: t("home.cta"),
  };
}

export default async function Home({ searchParams, params }: HomeProps) {
  const { t } = await useTranslation(params.locale);

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container w-full px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-x-2 gap-y-standard pt-4 lg:flex-row">
            <div className="max-w-2xl flex-1 flex-col justify-start">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t("appName")}
              </h1>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {t("home.subtitle")}
              </p>
            </div>
            <SearchTextField />
          </div>
        </div>
      </section>
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center space-y-4">
                  <LoadingSpinner />
                </div>
              }
            >
              <Cities searchParams={searchParams} params={params} t={t} />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

const Cities = async ({ searchParams, t }: HomeProps & { t: TFunction }) => {
  const cities = await api.cities.getStartPageCities({
    searchQuery: searchParams?.searchQuery,
  });

  const favoriteCitiesSlugsSet = new Set(
    cookies().get("waslaeuftin-favorite-cities")?.value.split(",") ?? [],
  );

  const favoriteCities = cities.filter((city) =>
    favoriteCitiesSlugsSet.has(city.slug),
  );

  const nonFavoriteCities = cities.filter(
    (city) => !favoriteCitiesSlugsSet.has(city.slug),
  );

  return (
    <>
      {favoriteCities.length > 0 && (
        <>
          <h2 className="text-3xl font-semibold">{t("favorites")}</h2>
          {favoriteCities.map((city) => (
            <CityRow key={city.slug} city={city} isFavorite={true} />
          ))}
          <div className="my-4 border-b border-slate-300" />
        </>
      )}
      {nonFavoriteCities.length > 0 && (
        <>
          {nonFavoriteCities.map((city) => (
            <CityRow key={city.slug} city={city} isFavorite={false} />
          ))}
        </>
      )}
      {cities.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-center text-lg">
            {t("no.search-results")}
            <br />
            <Link href="/request-cinema" className="text-sm underline">
              {t("request.cinema.cta")}
            </Link>
          </div>
        </div>
      )}
      {cities.length > 0 && (
        <section className="py-3 md:py-4 lg:py-6">
          <div className="container px-4 text-center md:px-6">
            <Link href="/request-cinema" className="text-sm underline">
              {t("request.cinema.cta")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
};
