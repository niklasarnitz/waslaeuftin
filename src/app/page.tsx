import Link from "next/link";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { cookies } from "next/headers";
import { api } from "@waslaeuftin/trpc/server";
import { CityRow } from "@waslaeuftin/components/CityRow";
import { type Metadata } from "next";
import { Constants } from "@waslaeuftin/globals/Constants";
import { SiteWrapper } from "@waslaeuftin/components/SiteWrapper";
import { getPathName } from "@waslaeuftin/helpers/getPathName";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: Constants.appName,
    description: Constants.home.cta,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | null | undefined;
    searchQuery?: string | null | undefined;
  }>;
}) {
  const pathname = await getPathName();
  const decodedParams = await searchParams;

  return (
    <SiteWrapper pathname={pathname} searchParams={decodedParams}>
      <main>
        <section className="px-8 py-8">
          <div className="grid gap-8">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center space-y-4">
                  <LoadingSpinner />
                </div>
              }
            >
              <Cities />
            </Suspense>
          </div>
        </section>
      </main>
    </SiteWrapper>
  );
}

const Cities = async () => {
  const awaitedCookies = await cookies();

  const favoriteCitiesSlugsSet = new Set(
    awaitedCookies.get("waslaeuftin-favorite-cities")?.value.split(",") ?? [],
  );

  const cities = await api.cities.getStartPageCities(
    Array.from(favoriteCitiesSlugsSet),
  );

  // TODO: Fallback if no favorites
  return (
    <>
      {cities.map((city) => (
        <CityRow key={city.slug} city={city} isFavorite={true} />
      ))}

      {cities.length === 0 && (
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-bold">
            Du hast noch keine favorisierte Stadt.
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Wähle eine Stadt aus, um sie zu deinen Favoriten hinzuzufügen.
          </p>
        </div>
      )}
      <div className="my-4 border-b border-slate-300" />
      <section className="py-3 md:py-4 lg:py-6">
        <div className="px-4 text-center md:px-6">
          <Link href="/request-cinema" className="text-sm underline">
            Dein Kino oder deine Stadt ist noch nicht aufgeführt? Wünsche es dir
            über diesen Link!
          </Link>
        </div>
      </section>
    </>
  );
};
