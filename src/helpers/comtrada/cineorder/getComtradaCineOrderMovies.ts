import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import { type ComtradaCineOrderMovie } from "@waslaeuftin/helpers/comtrada/cineorder/types/ComtradaCineOrderMovie";
import {
  type Movie,
  type Showing,
  type ComtradaCineOrderCinemasType,
  Cinemas,
} from "@waslaeuftin/types/Movie";
import moment from "moment";
import { xior } from "xior";

const CineOrderUrls: Record<ComtradaCineOrderCinemasType, string> = {
  universum_karlsruhe: "https://ts.kinopolis.de",
  zkm_karlsruhe: "https://cineorder.filmpalast.net",
};

const CenterIds: Record<ComtradaCineOrderCinemasType, string> = {
  universum_karlsruhe: "19210000014PLXMQDD",
  zkm_karlsruhe: "6F000000014BHGWDVI",
};

export const getComtradCineOrderMovies = async (
  cinema: ComtradaCineOrderCinemasType,
  date?: Date,
) => {
  let query = "";

  if (date) {
    const dateString = moment(date).format("YYYY-MM-DD");
    query = `?cinemadate.from=${dateString}&cinemadate.to=${dateString}&performancedate.from=${dateString}&performancedate.to=${dateString}`;
  }

  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<ComtradaCineOrderMovie[]>(
    `${CineOrderUrls[cinema]}/api/films${query}`,
    {
      headers: {
        "Center-Oid": CenterIds[cinema],
      },
    },
  );

  return data.map(
    (movie) =>
      ({
        name: movie.title,
        format: movie.performances.some((performance) => performance.is3D)
          ? "3D"
          : "2D",
        showings: movie.performances.map((performance) => {
          const showingAdditionalData = [
            performance.is3D ? "3D" : "2D",
            performance.auditoriumName,
            performance.releaseTypeName,
            performance.soundSystem,
          ].join(UIConstants.bullet);

          return {
            dateTime: new Date(performance.performanceDateTime),
            bookingUrl: performance.ticketTitle
              ? `https://cineorder.filmpalast.net/zkm/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`
              : undefined,
            showingAdditionalData,
          } satisfies Showing;
        }),
        cinema: Cinemas[cinema],
      }) satisfies Movie,
  );
};
