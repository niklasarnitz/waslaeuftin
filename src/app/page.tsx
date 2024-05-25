import { Button } from "@waslaeuftin/components/ui/button";
import { db } from "@waslaeuftin/server/db";
import Link from "next/link";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: {
    searchQuery?: string;
  };
};

export default function Home({ searchParams }: HomeProps) {
  return (
    <main className="container">
      <div className="flex flex-col items-center justify-center space-y-4">
        <h1 className="pt-4 text-4xl font-bold">was läuft in</h1>
        <SearchTextField />
        <Suspense fallback={<LoadingSpinner />}>
          <Cities searchParams={searchParams} />
        </Suspense>
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
  const cities = await db.city.findMany({
    orderBy: {
      name: "asc",
    },
    where: searchParams?.searchQuery
      ? { name: { contains: searchParams.searchQuery, mode: "insensitive" } }
      : undefined,
  });

  return (
    <>
      {cities.map((city) => (
        <Link
          key={city.slug}
          href={`/city/${city.slug}/today`}
          className="dark:border-background-muted rounded-lg border shadow-sm dark:hover:border-foreground/60"
        >
          <Button variant="link" className="dark:text-foreground">
            {city.name}
          </Button>
        </Link>
      ))}
    </>
  );
};
