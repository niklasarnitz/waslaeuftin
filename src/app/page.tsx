import Link from "next/link";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { cookies } from "next/headers";
import { api } from "@waslaeuftin/trpc/server";
import { CityRow } from "@waslaeuftin/components/CityRow";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: {
    searchQuery?: string;
  };
};

export default function Home({ searchParams }: HomeProps) {
  return (
    <main>
      <section className="bg-gray-100 py-12 dark:bg-gray-950 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Entdecke, was heute in deiner Stadt läuft
            </h1>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Finde sofort die besten Kinos und Filme, die heute in deiner Stadt
              laufen.
            </p>
            <div className="mt-standard w-full flex-1 flex-row items-center justify-center">
              <SearchTextField />
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 md:py-16 lg:py-20">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8">
            <Suspense fallback={<LoadingSpinner />}>
              <Cities searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </section>
      <div className="flex flex-col items-center justify-center space-y-4">
        <Link href="/request-cinema" className="text-center text-sm underline">
          Dein Kino oder deine Stadt ist noch nicht aufgeführt?
          <br />
          Wünsche es dir über diesen Link!
        </Link>
      </div>
    </main>
  );
}

const Cities = async ({ searchParams }: HomeProps) => {
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
          <div className="text-lg font-light">Keine Suchergebnisse.</div>
        </div>
      )}
    </>
  );
};
