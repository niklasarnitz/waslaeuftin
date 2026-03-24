import { Clock3, Film } from "lucide-react";

import { MovieCover } from "@waslaeuftin/components/MovieCover";

import { CinemaShowingsCard } from "./CinemaShowingsCard";
import { formatShowingTime } from "./formatters";
import type { ListingMovieCard } from "./types";

type MovieCardProps = {
  movie: ListingMovieCard;
  maxShowingsPerCinema?: number;
};

export const MovieCard = ({
  movie,
  maxShowingsPerCinema = 5,
}: MovieCardProps) => {
  const sortedCinemas = [...movie.cinemaEntries].sort((left, right) => {
    const leftTime =
      left.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;
    const rightTime =
      right.nextShowing?.dateTime.getTime() ?? Number.POSITIVE_INFINITY;

    if (leftTime === rightTime) {
      return left.cinema.name.localeCompare(right.cinema.name);
    }

    return leftTime - rightTime;
  });

  return (
    <article className="rounded-xl border border-border/70 bg-background/85 p-3 transition-colors hover:bg-background sm:rounded-2xl sm:p-4 md:p-5">
      {/* Title + badge — mobile only */}
      <div className="mb-2 flex items-start justify-between gap-2 sm:hidden">
        <h4 className="line-clamp-2 text-base font-bold tracking-tight">
          {movie.name}
        </h4>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {movie.cinemaEntries.length}{" "}
          {movie.cinemaEntries.length === 1 ? "Kino" : "Kinos"}
        </span>
      </div>

      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 sm:grid-cols-[100px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
        <div>
          <MovieCover
            title={movie.name}
            coverUrl={movie.coverUrl}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          {/* Title + badge — desktop only */}
          <div className="hidden items-start justify-between gap-2 sm:flex">
            <h4 className="line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
              {movie.name}
            </h4>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {movie.cinemaEntries.length}{" "}
              {movie.cinemaEntries.length === 1 ? "Kino" : "Kinos"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:mt-3 sm:gap-2 sm:text-xs">
            <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
              {movie.showingsCount} Vorstellungen
            </span>
            {movie.nextShowing && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-0.5 sm:px-2.5 sm:py-1">
                <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Nächste um {formatShowingTime(movie.nextShowing.dateTime)}
              </span>
            )}
          </div>

          {/* Cinema showings — desktop */}
          <div className="hidden sm:mt-4 sm:block sm:space-y-3">
            {sortedCinemas.map((cinemaEntry) => (
              <CinemaShowingsCard
                key={`${movie.name}-${cinemaEntry.cinema.id}-desktop`}
                cinemaEntry={cinemaEntry}
                movieName={movie.name}
                maxShowings={maxShowingsPerCinema}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cinema showings — mobile */}
      <div className="mt-3 space-y-2 sm:hidden">
        {sortedCinemas.map((cinemaEntry) => (
          <CinemaShowingsCard
            key={`${movie.name}-${cinemaEntry.cinema.id}-mobile`}
            cinemaEntry={cinemaEntry}
            movieName={movie.name}
            maxShowings={maxShowingsPerCinema}
          />
        ))}
      </div>
    </article>
  );
};
