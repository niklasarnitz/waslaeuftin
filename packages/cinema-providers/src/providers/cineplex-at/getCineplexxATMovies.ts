import { ArrayHelper } from "@ainias42/js-helper";
import moment from "moment-timezone";
import { Xior } from "xior";

import type { CineplexxATMovie } from "@waslaeuftin/cinema-providers/internal/providers/cineplex-at/types/CineplexxATMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";

export const getCineplexxATMovies = async (
  cinemaId: number,
  cineplexxATCinemaId: string,
) => {
  const xiorInstance = Xior.create();

  const { data: availableDates } = await xiorInstance.get<string[]>(
    "https://app.cineplexx.at/api/v2/movies/filters/dates/list?location=all",
  );

  const data = (
    await Promise.all(
      availableDates.flatMap((date) =>
        xiorInstance.get<CineplexxATMovie[]>(
          `https://app.cineplexx.at/api/v1/cinemasweb/${cineplexxATCinemaId}/movies?date=${moment(date).format("YYYY-MM-DD")}`,
        ),
      ),
    )
  ).flatMap((r) => r.data);

  if (!data) {
    throw new Error("Could not load Cineplexx AT movies");
  }

  const movies = data.map((movie) => ({
    name: movie.title ?? movie.titleCalculated,
    cinemaId,
    provider: "CineplexxAT",
    providerFilmId: movie.id,
    evidence: {
      originalTitle: movie.titleOriginalCalculated?.trim()
        ? movie.titleOriginalCalculated
        : undefined,
      director:
        movie.directors
          ?.map((name) => name.trim())
          .filter(Boolean)
          .join(" / ") ||
        movie.director?.trim() ||
        undefined,
      runtimeMinutes:
        Number.isInteger(movie.runTime) && movie.runTime > 0
          ? movie.runTime
          : undefined,
    },
  }));

  const showings = data.map((movie, index) =>
    movie.sessions.map(
      (s) =>
        ({
          dateTime: moment(s.showtime).toDate(),
          bookingUrl: `https://cineplexx.at/purchase/wizard/${s.id}/tickets`,
          showingAdditionalData: Array.from(
            new Set(
              ArrayHelper.noUndefined([
                s.screenName,
                ...ArrayHelper.noUndefined(
                  s.technologies.flatMap((t) => t.map((n) => n)),
                ),
              ]),
            ),
          ),
          cinemaId,
          movieName: movies[index]!.name,
          provider: movies[index]!.provider,
          providerFilmId: movies[index]!.providerFilmId,
          evidence: movies[index]!.evidence,
        }) satisfies RawProviderShowing,
    ),
  );

  return {
    provider: "CineplexxAT",
    movies,
    showings,
  };
};
