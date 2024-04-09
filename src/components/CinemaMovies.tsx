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
        <div key={`${cinema.slug}-${movie.name}`}>
          <h2 className="text-lg font-semibold">{movie.name}</h2>
          <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-6">
            {movie.showings.map((showing) => {
              return (
                <Link
                  href={showing.bookingUrl ?? "#"}
                  key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                >
                  <Card className="dark:border-background-muted hover:border-gray-300 dark:hover:border-foreground/60">
                    <CardHeader>
                      <div className="text-gray-500 font-medium dark:text-foreground">
                        {moment(showing.dateTime).format("DD.MM.YYYY - HH:mm")}
                      </div>
                    </CardHeader>
                    {showing.showingAdditionalData && (
                      <CardContent>
                        <div className="text-gray-500 text-xs dark:text-foreground">
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
