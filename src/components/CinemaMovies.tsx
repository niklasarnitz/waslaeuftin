import { Card, CardContent, CardHeader } from "@waslaeuftin/components/ui/card";
import { type api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import Link from "next/link";

export type CinemaMoviesProps = {
  cinema: NonNullable<
    Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
  >["cinemas"][number];
};

export const CinemaMovies = ({ cinema }: CinemaMoviesProps) => {
  return (
    <div className="flex flex-col gap-y-4">
      {cinema.movies.map((movie) => (
        <div key={`${cinema.slug}-${movie.name}`} className="gap-4">
          <h2 className="pb-3 text-2xl font-semibold">{movie.name}</h2>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
            {movie.showings.map((showing) => {
              return (
                <Link
                  href={showing.bookingUrl ?? "#"}
                  key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                >
                  <Card className="dark:border-background-muted hover:border-gray-300 dark:hover:border-foreground/60">
                    <CardHeader>
                      <div className="font-medium text-gray-500 dark:text-foreground">
                        {moment(showing.dateTime).format("DD.MM.YYYY - HH:mm")}
                      </div>
                    </CardHeader>
                    {showing.showingAdditionalData && (
                      <CardContent>
                        <div className="text-xs text-gray-500 dark:text-foreground">
                          {showing.showingAdditionalData}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
