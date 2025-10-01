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

  const showings = data.performances
    .map((performance) => ({
      cinemaId,
      movieName: performance.title,
      dateTime: moment(performance.begin).toDate(),
      bookingUrl: `https://${subdomain}.premiumkino.de/vorstellung/${performance.slug}/${moment(performance.begin).format("YYYYMMDD")}/${moment(performance.begin).format("HHmm")}/${performance.id}`,
      showingAdditionalData: [
        // Need to get auditorium info from auditoriumId lookup
        `Rating: ${performance.rating}`,
        performance.language,
      ].join(UIConstants.bullet),
    }))
    .flat() satisfies Prisma.Args<typeof db.showing, "createMany">["data"];

  return {
    movies,
    showings,
  };
};
