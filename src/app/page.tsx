import Link from "next/link";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { cookies } from "next/headers";
import { api } from "@waslaeuftin/trpc/server";
import { CityRow } from "@waslaeuftin/components/CityRow";
import { type Metadata } from "next";
import { Constants } from "@waslaeuftin/globals/Constants";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    searchQuery?: string;
  }>;
};

export function generateMetadata(): Metadata {
  return {
    title: Constants.appName,
    description: Constants.home.cta,
  };
}

export default async function Home(props: HomeProps) {
  const searchParams = await props.searchParams;

  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container w-full px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-x-2 gap-y-standard pt-4 lg:flex-row">
            <div className="max-w-2xl flex-1 flex-col justify-start">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {Constants.appName}
              </h1>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {Constants.home.subtitle}
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
              <Cities searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

const Cities = async ({
  searchParams,
}: {
  searchParams: Awaited<HomeProps["searchParams"]>;
}) => {
  const cities = await api.cities.getStartPageCities({
    searchQuery: searchParams?.searchQuery,
  });

  const awaitedCookies = await cookies();

  const favoriteCitiesSlugsSet = new Set(
    awaitedCookies.get("waslaeuftin-favorite-cities")?.value.split(",") ?? [],
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
          <h2 className="text-3xl font-semibold">Favoriten</h2>
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
            Keine Suchergebnisse
            <br />
            <Link href="/request-cinema" className="text-sm underline">
              Dein Kino oder deine Stadt ist noch nicht aufgeführt? Wünsche es
              dir über diesen Link!
            </Link>
          </div>
        </div>
      )}
      {cities.length > 0 && (
        <section className="py-3 md:py-4 lg:py-6">
          <div className="container px-4 text-center md:px-6">
            <Link href="/request-cinema" className="text-sm underline">
              Dein Kino oder deine Stadt ist noch nicht aufgeführt? Wünsche es
              dir über diesen Link!
            </Link>
          </div>
        </section>
      )}
    </>
  );
};
