import { db } from "@waslaeuftin/server/db";
import Link from "next/link";
import { SearchTextField } from "@waslaeuftin/components/SearchTextField";
import { Suspense } from "react";
import { LoadingSpinner } from "@waslaeuftin/components/LoadingSpinner";
import { Card, CardContent } from "@waslaeuftin/components/ui/card";
import moment from "moment-timezone";

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
            <p className="text-gray-500 mt-4 dark:text-gray-400">
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
  const endOfDay = moment().endOf("day").toISOString();
  const currentDate = moment().toISOString();

  const showingsFilter = {
    dateTime: {
      gte: currentDate,
      lte: endOfDay,
    },
  };

  const cities = await db.city.findMany({
    orderBy: {
      name: "asc",
    },
    where: searchParams?.searchQuery
      ? { name: { contains: searchParams.searchQuery, mode: "insensitive" } }
      : undefined,
    include: {
      cinemas: {
        orderBy: {
          name: "asc",
        },
        include: {
          movies: {
            orderBy: {
              name: "asc",
            },
            include: {
              showings: {
                orderBy: {
                  dateTime: "asc",
                },
                where: showingsFilter,
              },
            },
            where: {
              showings: {
                some: showingsFilter,
              },
            },
          },
        },
        where: searchParams?.searchQuery
          ? {
              name: { contains: searchParams.searchQuery, mode: "insensitive" },
            }
          : undefined,
      },
    },
  });

  return (
    <>
      {cities.map((city) => (
        <div key={city.slug}>
          <div className="grid gap-4">
            <Link
              className="flex items-center justify-between"
              href={`/city/${city.slug}/today`}
            >
              <h2 className="text-2xl font-bold">
                Was läuft heute in {city.name}
              </h2>
              <div className="text-primary hover:underline hover:underline-offset-2">
                Alle
              </div>
            </Link>
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {city.cinemas.slice(0, 3).map((cinema) => (
                <Card key={cinema.slug}>
                  <CardContent className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="flex-1 text-lg font-semibold">
                        {cinema.name}
                      </h3>
                    </div>
                    <div className="grid gap-2">
                      {cinema.movies.slice(0, 4).map((movie) => (
                        <div
                          className="flex items-start justify-between gap-x-2"
                          key={`${cinema.slug}-${movie.name}`}
                        >
                          <div className="text-gray-500 flex-1 flex-wrap dark:text-gray-400">
                            {movie.name}
                          </div>
                          <div className="flex flex-row flex-wrap justify-end">
                            {movie.showings.map((showing, index) => (
                              <>
                                <Link
                                  className="text-primary hover:underline hover:underline-offset-2"
                                  href={showing.bookingUrl ?? cinema.websiteUrl}
                                  key={`${cinema.slug}-${movie.name}-${showing.dateTime.toISOString()}`}
                                >
                                  {moment(showing.dateTime).format("HH:mm")}
                                </Link>
                                {index !== movie.showings.length - 1 && (
                                  <span className="mx-2">|</span>
                                )}
                              </>
                            ))}
                          </div>
                        </div>
                      ))}
                      {cinema.movies.length > 4 && (
                        <div className="flex items-center justify-between">
                          <Link
                            className="text-gray-500 dark:text-gray-400 hover:underline hover:underline-offset-2"
                            href={`/cinema/${cinema.slug}?date=${moment().format("YYYY-MM-DD")}`}
                          >
                            + {cinema.movies.length - 4} Filme
                          </Link>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {city.cinemas.length > 3 && (
              <div className="flex items-center justify-end">
                <Link
                  className="text-primary hover:underline hover:underline-offset-2"
                  href={`/city/${city.slug}/today`}
                >
                  + {city.cinemas.length - 3}{" "}
                  {city.cinemas.length - 3 === 1 ? "Kino" : "Kinos"}
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}
      {cities.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-lg font-light">Keine Suchergebnisse.</div>
        </div>
      )}
    </>
  );
};
