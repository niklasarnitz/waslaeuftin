import { type PremiumKinoApiResponse } from "@waslaeuftin/cinemaProviders/premiumkino/PremiumKinoTypes";
import { xior } from "xior";
import moment from "moment-timezone";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";

export const getPremiumKinoMovies = async (
  cinemaId: number,
  subdomain: string,
) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<PremiumKinoApiResponse>(
    `https://backend.premiumkino.de/v1/de/${subdomain}/program`,
  );

  const movies = data.movies.map((movie) => ({
    name: movie.name,
    cinemaId,
  }));

  // Create a map of movieId -> movieName to properly link performances to movies
  const movieIdToNameMap = new Map<string, string>();
  data.movies.forEach((movie) => {
    movieIdToNameMap.set(movie.id, movie.name);
  });

  const showings = data.performances
    .map((performance) => {
      const movieName = movieIdToNameMap.get(performance.movieId);
      if (!movieName) {
        console.warn(
          `No movie found for performance with movieId: ${performance.movieId}`,
        );
        return null;
      }

      return {
        cinemaId,
        movieName,
        dateTime: moment(performance.begin).toDate(),
        bookingUrl: `https://${subdomain}.premiumkino.de/vorstellung/${performance.slug}/${moment(performance.begin).format("YYYYMMDD")}/${moment(performance.begin).format("HHmm")}/${performance.id}`,
        showingAdditionalData: [
          `Rating: ${performance.rating}`,
          performance.language,
        ].join(UIConstants.bullet),
      };
    })
    .filter((showing) => showing !== null)
    .flat() satisfies Prisma.Args<typeof db.showing, "createMany">["data"];

  return {
    movies,
    showings,
  };
};
