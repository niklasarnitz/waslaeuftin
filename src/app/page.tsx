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
import { Clapperboard, MapPin } from "lucide-react";

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
      <main className="mx-auto w-full max-w-[1200px]">
        <section className="px-4 py-6 md:px-6 md:py-8">
          <div className="mb-6 rounded-2xl border border-border/70 bg-gradient-to-br from-amber-100/70 via-orange-50 to-background p-5 shadow-sm dark:from-amber-950/25 dark:via-orange-950/10 dark:to-background md:p-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Clapperboard className="h-3.5 w-3.5" />
              Deine Kino-Übersicht
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Was läuft heute in deinen Städten?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Öffne ein Kino und buche direkt aus der Übersicht. Nutze die Suche links,
              um sofort die passende Stadt oder das richtige Kino zu finden.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Favoriten zuerst, damit du schneller zur nächsten Vorstellung kommst.
            </div>
          </div>

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
        <div className="rounded-xl border border-dashed border-border px-4 py-5">
          <h2 className="text-xl font-bold tracking-tight">
            Du hast noch keine favorisierte Stadt.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Wähle eine Stadt aus, um sie zu deinen Favoriten hinzuzufügen.
          </p>
        </div>
      )}

      <section className="rounded-xl border border-border/70 bg-card/50 px-4 py-4 text-center md:px-6">
        <div>
          <Link href="/request-cinema" className="text-sm font-medium text-primary underline underline-offset-4">
            Dein Kino oder deine Stadt ist noch nicht aufgeführt? Wünsche es dir
            über diesen Link!
          </Link>
        </div>
      </section>
    </>
  );
};
