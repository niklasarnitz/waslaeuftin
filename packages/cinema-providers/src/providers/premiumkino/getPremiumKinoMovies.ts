import moment from "moment-timezone";
import xior from "xior";

import { type PremiumKinoApiResponse } from "@waslaeuftin/cinema-providers/internal/providers/premiumkino/PremiumKinoTypes";

export const getPremiumKinoMovies = async (
  cinemaId: number,
  subdomain: string,
) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<PremiumKinoApiResponse>(
    `https://backend.premiumkino.de/v1/de/${subdomain}/program`,
  );

  if (!data) {
    throw new Error("Could not load PremiumKino movies");
  }

  const movies = data.movies.map((movie) => ({
    name: movie.name,
    cinemaId,
    provider: "PremiumKino",
    providerFilmId: movie.id,
    evidence: {
      productionYear:
        Number.isInteger(movie.year) && movie.year >= 1800 && movie.year <= 2100
          ? movie.year
          : undefined,
      runtimeMinutes:
        Number.isInteger(movie.minutes) && movie.minutes > 0
          ? movie.minutes
          : undefined,
    },
  }));

  const moviesById = new Map(
    movies.map((movie) => [movie.providerFilmId, movie]),
  );

  const showings = data.performances
    .map((performance) => {
      const movie = moviesById.get(performance.movieId);
      if (!movie) {
        console.warn(
          `No movie found for performance with movieId: ${performance.movieId}`,
        );
        return null;
      }

      return {
        cinemaId,
        movieName: movie.name,
        provider: movie.provider,
        providerFilmId: movie.providerFilmId,
        evidence: movie.evidence,
        dateTime: moment(performance.begin).toDate(),
        bookingUrl: `https://${subdomain}.premiumkino.de/vorstellung/${performance.slug}/${moment(performance.begin).format("YYYYMMDD")}/${moment(performance.begin).format("HHmm")}/${performance.id}`,
        showingAdditionalData: [
          `Rating: ${performance.rating}`,
          performance.language,
        ].filter((v): v is string => typeof v === "string" && v.length > 0),
      };
    })
    .filter((showing) => showing !== null)
    .flat();

  return {
    provider: "PremiumKino",
    movies,
    showings,
  };
};
