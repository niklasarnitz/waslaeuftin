import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import { type ComtradaCineOrderMovie } from "@waslaeuftin/helpers/comtrada/cineorder/types/ComtradaCineOrderMovie";
import {
  type Movie,
  type Cinema,
  type Showing,
} from "@waslaeuftin/types/Movie";
import moment from "moment";
import { xior } from "xior";

export const getComtradCineOrderMovies = async (
  cinema: Cinema,
  date?: Date,
) => {
  let query = "";

  if (date) {
    const dateString = moment(date).format("YYYY-MM-DD");
    query = `?cinemadate.from=${dateString}&cinemadate.to=${dateString}&performancedate.from=${dateString}&performancedate.to=${dateString}`;
  }

  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<ComtradaCineOrderMovie[]>(
    `https://cineorder.filmpalast.net/api/films${query}`,
    {
      headers: {
        "Center-Oid": "6F000000014BHGWDVI",
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
        cinema,
      }) satisfies Movie,
  );
};
