import { FavoriteButton } from "@waslaeuftin/components/FavoriteButton";
import { Card, CardContent } from "@waslaeuftin/components/ui/card";
import { type api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import Link from "next/link";

export const CityRow = ({
  city,
  isFavorite,
}: {
  city: Awaited<ReturnType<typeof api.cities.getStartPageCities>>[number];
  isFavorite: boolean;
}) => {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Link href={`/city/${city.slug}/today`}>
            <h2 className="text-2xl font-bold">
              Was läuft heute in {city.name}
            </h2>
          </Link>
          <FavoriteButton city={city} isFavorite={isFavorite} />
        </div>
        <Link
          href={`/city/${city.slug}/today`}
          className="pl-3 text-primary hover:underline hover:underline-offset-2"
        >
          Alle
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {(isFavorite ? city.cinemas : city.cinemas.slice(0, 3)).map(
          (cinema) => (
            <Card key={`${city.slug}-${cinema.slug}`}>
              <CardContent className="flex flex-col gap-4 p-6">
                <Link
                  className="flex items-center justify-between hover:underline hover:underline-offset-2"
                  href={`/cinema/${cinema.slug}`}
                >
                  <h3 className="flex-1 text-lg font-semibold">
                    {cinema.name}
                  </h3>
                </Link>
                <div className="grid gap-2">
                  {cinema.movies.slice(0, 4).map((movie) => (
                    <div
                      className="flex items-start justify-between gap-x-2"
                      key={`${cinema.slug}-${movie.name}`}
                    >
                      <div className="flex-1 flex-wrap text-gray-500 dark:text-gray-400">
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
                        className="text-gray-500 hover:underline hover:underline-offset-2 dark:text-gray-400"
                        href={`/cinema/${cinema.slug}?date=${moment().format("YYYY-MM-DD")}`}
                      >
                        + {cinema.movies.length - 4} Filme
                      </Link>
                    </div>
                  )}
                </div>
                {cinema.movies.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    Heute keine Vorstellungen mehr.
                  </p>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>
      {!isFavorite && city.cinemas.length > 3 && (
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
  );
};
