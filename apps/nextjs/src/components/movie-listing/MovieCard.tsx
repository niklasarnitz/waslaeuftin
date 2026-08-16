"use client";

import { Clock3, Film, Play, Star } from "lucide-react";

import type { ListingMovieCard } from "@waslaeuftin/core";
import { CinemaShowingsCard } from "@waslaeuftin/components/movie-listing/CinemaShowingsCard";
import { MovieCover } from "@waslaeuftin/components/MovieCover";
import { formatShowingTime } from "@waslaeuftin/core";

type MovieCardProps = {
  movie: ListingMovieCard;
  maxShowingsPerCinema?: number;
  eagerCover?: boolean;
};

export const MovieCard = ({
  movie,
  maxShowingsPerCinema = 5,
  eagerCover = false,
}: MovieCardProps) => {
  const cinemaEntries = movie.cinemaEntries ?? movie.cinemas;
  const sortedCinemas = [...cinemaEntries].sort((left, right) => {
    const leftTime = left.nextShowing
      ? new Date(left.nextShowing.dateTime).getTime()
      : Number.POSITIVE_INFINITY;
    const rightTime = right.nextShowing
      ? new Date(right.nextShowing.dateTime).getTime()
      : Number.POSITIVE_INFINITY;

    if (leftTime === rightTime) {
      return left.cinema.name.localeCompare(right.cinema.name);
    }

    return leftTime - rightTime;
  });

  const meta = movie.tmdbMetadata;
  const tmdbId = meta?.tmdbId;
  const tmdbMovieUrl = tmdbId
    ? `https://www.themoviedb.org/movie/${tmdbId}`
    : null;

  const directors: Array<{ id: number; name: string }> = Array.isArray(
    meta?.directors,
  )
    ? meta.directors
    : [];

  const cast: Array<{ id: number; name: string; character?: string | null }> =
    Array.isArray(meta?.cast) ? meta.cast.slice(0, 5) : [];

  const productionCompanies: Array<{ id: number; name: string }> =
    Array.isArray(meta?.productionCompanies) ? meta.productionCompanies : [];

  return (
    <article className="border-border/70 bg-background/85 hover:bg-background rounded-xl border p-3 transition-colors sm:rounded-2xl sm:p-4 md:p-5">
      {/* Title + badge — mobile only */}
      <div className="mb-2 flex items-start justify-between gap-2 sm:hidden">
        <h4 className="line-clamp-2 text-base font-bold tracking-tight">
          {movie.name}
        </h4>
        <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          {cinemaEntries.length} {cinemaEntries.length === 1 ? "Kino" : "Kinos"}
        </span>
      </div>

      <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 sm:grid-cols-[100px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
        <div className="space-y-2">
          <MovieCover
            title={movie.name}
            coverUrl={movie.coverUrl}
            className="w-full"
            eager={eagerCover}
          />

          {/* Action buttons under poster */}
          <div className="flex flex-col gap-1.5 pt-1">
            {meta?.trailerUrl && (
              <a
                href={meta.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold shadow-sm transition-colors"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Trailer</span>
              </a>
            )}
            {tmdbMovieUrl && (
              <a
                href={tmdbMovieUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary/80 hover:bg-secondary text-secondary-foreground border-border flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors"
              >
                <Film className="h-3 w-3" />
                <span>TMDB</span>
              </a>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2.5">
          {/* Title + badge — desktop only */}
          <div className="hidden items-start justify-between gap-2 sm:flex">
            <h4 className="line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
              {movie.name}
            </h4>
            <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
              {cinemaEntries.length}{" "}
              {cinemaEntries.length === 1 ? "Kino" : "Kinos"}
            </span>
          </div>

          {/* Meta row badges */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
            <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
              {movie.showingsCount} Vorstellungen
            </span>
            {movie.nextShowing && (
              <span className="border-border/80 bg-background/80 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
                <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Nächste um {formatShowingTime(movie.nextShowing.dateTime)}
              </span>
            )}
            {meta?.certification && (
              <span className="border-border/80 bg-muted/60 text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase sm:px-2.5 sm:py-1">
                FSK {meta.certification}
              </span>
            )}
            {meta?.runtime ? (
              <span className="border-border/80 bg-background/80 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1">
                {meta.runtime} Min.
              </span>
            ) : null}
            {meta?.voteAverage ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600 sm:px-2.5 sm:py-1 dark:text-amber-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {meta.voteAverage.toFixed(1)}
              </span>
            ) : null}
          </div>

          {/* Directors, Cast, Studios */}
          {(directors.length > 0 ||
            cast.length > 0 ||
            productionCompanies.length > 0) && (
            <div className="space-y-1.5 text-xs">
              {directors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-semibold">
                    Regie:
                  </span>
                  {directors.map((director) => (
                    <a
                      key={`dir-${director.id}`}
                      href={`https://www.themoviedb.org/person/${director.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {director.name}
                    </a>
                  ))}
                </div>
              )}

              {cast.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-semibold">
                    Besetzung:
                  </span>
                  {cast.map((actor) => (
                    <a
                      key={`actor-${actor.id}`}
                      href={`https://www.themoviedb.org/person/${actor.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {actor.name}
                      {actor.character ? ` (${actor.character})` : ""}
                    </a>
                  ))}
                </div>
              )}

              {productionCompanies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-semibold">
                    Studio:
                  </span>
                  {productionCompanies.map((studio) => (
                    <a
                      key={`studio-${studio.id}`}
                      href={`https://www.themoviedb.org/company/${studio.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {studio.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview snippet */}
          {meta?.overview && (
            <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
              {meta.overview}
            </p>
          )}

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
