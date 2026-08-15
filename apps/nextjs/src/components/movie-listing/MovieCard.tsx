"use client";

import { useState } from "react";
import { Clock3, Film, Play, Star } from "lucide-react";

import type { ListingMovieCard } from "@waslaeuftin/components/movie-listing/types";
import { CinemaShowingsCard } from "@waslaeuftin/components/movie-listing/CinemaShowingsCard";
import { formatShowingTime } from "@waslaeuftin/components/movie-listing/formatters";
import { MovieCover } from "@waslaeuftin/components/MovieCover";
import { TmdbWebviewModal } from "@waslaeuftin/components/TmdbWebviewModal";

type MovieCardProps = {
  movie: ListingMovieCard;
  maxShowingsPerCinema?: number;
  eagerCover?: boolean;
};

type WebviewState = {
  isOpen: boolean;
  url: string | null;
  title: string;
};

export const MovieCard = ({
  movie,
  maxShowingsPerCinema = 5,
  eagerCover = false,
}: MovieCardProps) => {
  const [webview, setWebview] = useState<WebviewState>({
    isOpen: false,
    url: null,
    title: "",
  });

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

  const meta = movie.tmdbMetadata;
  const tmdbId = meta?.tmdbId;
  const tmdbMovieUrl = tmdbId
    ? `https://www.themoviedb.org/movie/${tmdbId}`
    : `https://www.themoviedb.org/search/movie?query=${encodeURIComponent(movie.name)}`;

  const openWebview = (url: string, title: string) => {
    setWebview({ isOpen: true, url, title });
  };

  const closeWebview = () => {
    setWebview((prev) => ({ ...prev, isOpen: false }));
  };

  const directors: Array<{ id: number; name: string }> = Array.isArray(
    meta?.directors,
  )
    ? meta.directors
    : [];

  const cast: Array<{ id: number; name: string; character?: string }> =
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
          {movie.cinemaEntries.length}{" "}
          {movie.cinemaEntries.length === 1 ? "Kino" : "Kinos"}
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors shadow-sm"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Trailer</span>
              </a>
            )}
            <button
              onClick={() => openWebview(tmdbMovieUrl, `${movie.name} (TMDB)`)}
              className="bg-secondary/80 hover:bg-secondary text-secondary-foreground flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold transition-colors"
            >
              <Film className="h-3 w-3" />
              <span>TMDB</span>
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-2.5">
          {/* Title + badge — desktop only */}
          <div className="hidden items-start justify-between gap-2 sm:flex">
            <h4 className="line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
              {movie.name}
            </h4>
            <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
              {movie.cinemaEntries.length}{" "}
              {movie.cinemaEntries.length === 1 ? "Kino" : "Kinos"}
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
              <span className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold sm:px-2.5 sm:py-1">
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
                    <button
                      key={`dir-${director.id}`}
                      onClick={() =>
                        openWebview(
                          `https://www.themoviedb.org/person/${director.id}`,
                          director.name,
                        )
                      }
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {director.name}
                    </button>
                  ))}
                </div>
              )}

              {cast.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-semibold">
                    Besetzung:
                  </span>
                  {cast.map((actor) => (
                    <button
                      key={`actor-${actor.id}`}
                      onClick={() =>
                        openWebview(
                          `https://www.themoviedb.org/person/${actor.id}`,
                          actor.name,
                        )
                      }
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {actor.name}
                      {actor.character ? ` (${actor.character})` : ""}
                    </button>
                  ))}
                </div>
              )}

              {productionCompanies.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground font-semibold">
                    Studio:
                  </span>
                  {productionCompanies.map((studio) => (
                    <button
                      key={`studio-${studio.id}`}
                      onClick={() =>
                        openWebview(
                          `https://www.themoviedb.org/company/${studio.id}`,
                          studio.name,
                        )
                      }
                      className="bg-muted/70 hover:bg-muted text-foreground border-border/60 hover:border-primary/50 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
                    >
                      {studio.name}
                    </button>
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

      {/* TMDB Webview Modal */}
      <TmdbWebviewModal
        url={webview.url}
        title={webview.title}
        isOpen={webview.isOpen}
        onClose={closeWebview}
      />
    </article>
  );
};
