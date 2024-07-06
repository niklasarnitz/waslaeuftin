import { type PremiumKinoMovie } from "@waslaeuftin/cinemaProviders/premiumkino/PremiumKinoTypes";
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

  const { data } = await xiorInstance.get<PremiumKinoMovie[]>(
    `https://${subdomain}.premiumkino.de/api/v1/de/movies`,
  );

  const movies = data.map((movie) => ({
    name: movie.name,
    cinemaId,
  }));

  const showings = data
    .map((movie) =>
      movie.performances.map((performance) => ({
        cinemaId,
        movieName: movie.name,
        dateTime: moment(performance.begin).toDate(),
        bookingUrl: `https://${subdomain}.premiumkino.de/vorstellung/${movie.slug}/${moment(performance.begin).format("YYYYMMDD")}/${moment(performance.begin).format("HHmm")}/${performance.crypt_id}`,
        showingAdditionalData: [
          performance.auditorium,
          `FSK-${performance.fsk}`,
          performance.release_type,
        ].join(UIConstants.bullet),
      })),
    )
    .flat() satisfies Prisma.Args<typeof db.showing, "createMany">["data"];

  return {
    movies,
    showings,
  };
};
