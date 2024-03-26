import { type ComtradaCineOrderMovie } from "@waslaeuftin/helpers/comtrada/cineorder/types/ComtradaCineOrderMovie";
import { type Movie, type Cinema } from "@waslaeuftin/types/Movie";
import axios from "axios";
import moment from "moment";

export const getComtradCineOrderMovies = async (
  cinema: Cinema,
  date?: Date,
) => {
  let query = "";

  if (date) {
    const dateString = moment(date).format("YYYY-MM-DD");
    query = `?cinemadate.from=${dateString}&cinemadate.to=${dateString}&performancedate.from=${dateString}&performancedate.to=${dateString}`;
  }

  const { data } = await axios.get<ComtradaCineOrderMovie[]>(
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
        showings: movie.performances.map((performance) => ({
          dateTime: new Date(performance.performanceDateTime),
          bookingUrl: performance.ticketTitle
            ? `https://cineorder.filmpalast.net/zkm/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`
            : undefined,
        })),
        cinema,
      }) satisfies Movie,
  );
};
