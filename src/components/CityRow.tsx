import { FavoriteButton } from "@waslaeuftin/components/FavoriteButton";
import { Card, CardContent } from "@waslaeuftin/components/ui/card";
import { type api } from "@waslaeuftin/trpc/server";
import { Clock3, Ticket } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";

const getTotalShowings = (
  cinema: Awaited<ReturnType<typeof api.cities.getStartPageCities>>[number]["cinemas"][number],
) => {
  return cinema.movies.reduce((total, movie) => total + movie.showings.length, 0);
};

const getNextShowing = (
  cinema: Awaited<ReturnType<typeof api.cities.getStartPageCities>>[number]["cinemas"][number],
) => {
  return cinema.movies
    .flatMap((movie) => movie.showings)
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0];
};

export const CityRow = ({
  city,
  isFavorite,
}: {
  city: Awaited<ReturnType<typeof api.cities.getStartPageCities>>[number];
  isFavorite: boolean;
}) => {
  const visibleCinemas = isFavorite ? city.cinemas : city.cinemas.slice(0, 3);

  return (
    <section className="grid gap-4 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-x-2">
          <Link href={`/city/${city.slug}`} className="group inline-flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight group-hover:underline group-hover:underline-offset-4">
              {city.name}
            </h2>
          </Link>
          <FavoriteButton city={city} isFavorite={isFavorite} />
        </div>
        <Link
          href={`/city/${city.slug}`}
          className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          Alle Kinos ansehen
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {visibleCinemas.map((cinema) => {
          const totalShowings = getTotalShowings(cinema);
          const nextShowing = getNextShowing(cinema);

          return (
            <Card
              key={`${city.slug}-${cinema.slug}`}
              className="border-border/80 bg-background/85 transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-col gap-4 p-4">
                <Link
                  className="group flex items-center justify-between gap-2"
                  href={`/cinema/${cinema.slug}`}
                >
                  <h3 className="flex-1 text-lg font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                    {cinema.name}
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {totalShowings} Zeiten
                  </span>
                </Link>

                {nextShowing && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Nächste Vorstellung um {moment(nextShowing.dateTime).format("HH:mm")}
                  </div>
                )}

                <div className="grid gap-2.5">
                  {cinema.movies.slice(0, 3).map((movie) => (
                    <div
                      className="flex items-start justify-between gap-x-2"
                      key={`${cinema.slug}-${movie.name}`}
                    >
                      <div className="min-w-fit flex-1 flex-wrap break-words text-sm text-foreground/85">
                        {movie.name}
                      </div>
                      <div className="max-w-1/2 flex min-w-0 flex-row flex-wrap justify-end gap-1 break-words">
                        {movie.showings.slice(0, 3).map((showing) => (
                          <div key={`${cinema.slug}-${movie.name}-${showing.dateTime.toISOString()}`}>
                            <Link
                              className="inline-flex items-center rounded-full border border-border/80 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
                              href={showing.bookingUrl ?? "#"}
                              key={`${cinema.slug}-${movie.name}-${showing.dateTime.toISOString()}`}
                            >
                              {moment(showing.dateTime).format("HH:mm")}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {cinema.movies.length > 3 && (
                    <div className="flex items-center justify-between">
                      <Link
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                        href={`/cinema/${cinema.slug}?date=${moment().format("YYYY-MM-DD")}`}
                      >
                        <Ticket className="h-4 w-4" />
                        + {cinema.movies.length - 3} weitere Filme
                      </Link>
                    </div>
                  )}
                </div>

                {cinema.movies.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    Heute keine Vorstellungen mehr.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isFavorite && city.cinemas.length > 3 && (
        <div className="flex items-center justify-end">
          <Link
            className="text-sm font-semibold text-primary hover:underline hover:underline-offset-2"
            href={`/city/${city.slug}`}
          >
            + {city.cinemas.length - 3}{" "}
            {city.cinemas.length - 3 === 1 ? "Kino" : "Kinos"}
          </Link>
        </div>
      )}
    </section>
  );
};
