import { Card, CardContent, CardHeader } from "@waslaeuftin/components/ui/card";
import { MovieCover } from "@waslaeuftin/components/MovieCover";
import { ShowingTags } from "@waslaeuftin/components/ShowingTags";
import { type api } from "@waslaeuftin/trpc/server";
import { Ticket } from "lucide-react";
import moment from "moment-timezone";
import Link from "next/link";

export type CinemaMoviesProps = {
  cinema: NonNullable<
    Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
  >["cinemas"][number];
};

export const CinemaMovies = ({ cinema }: CinemaMoviesProps) => {
  return (
    <div className="flex flex-col gap-y-6">
      {cinema.movies.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Für den ausgewählten Tag wurden keine Vorstellungen gefunden.
        </div>
      )}

      {cinema.movies.map((movie) => (
        <section
          key={`${cinema.slug}-${movie.name}`}
          className="rounded-2xl border border-border/70 bg-card/60 p-4 md:p-5"
        >
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[260px] md:mx-0">
              <MovieCover
                title={movie.name}
                coverUrl={movie.coverUrl}
                className="w-full"
              />
            </div>

            <div className="min-w-0">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {movie.name}
                </h2>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {movie.showings.length} Termine
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {movie.showings.map((showing) => {
                  return (
                    <Link
                      href={showing.bookingUrl ?? "#"}
                      key={`${cinema.slug}-${showing.id}-${showing.dateTime.toISOString()}-${movie.name}`}
                    >
                      <Card className="h-full border-border/80 bg-background/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                            <Ticket className="h-3.5 w-3.5" />
                            {moment(showing.dateTime).format("HH:mm")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {moment(showing.dateTime).format("dddd, DD.MM.YYYY")}
                          </div>
                        </CardHeader>
                        {showing.showingAdditionalData && (
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1">
                              <ShowingTags
                                titleTags={[]}
                                additionalData={showing.showingAdditionalData}
                              />
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
