import {
  type ComtradaCineOrderMoviePerformance,
  type ComtradaCineOrderMovie,
} from "@waslaeuftin/cinemaProviders/comtrada/cineorder/types/ComtradaCineOrderMovie";
import moment from "moment-timezone";
import xior from "xior";
import { type ComtradaCineOrderMetadata } from "@prisma/client";

const getTicketUrl = (
  metadata: ComtradaCineOrderMetadata,
  movie: ComtradaCineOrderMovie,
  performance: ComtradaCineOrderMoviePerformance,
) => {
  return `${metadata.backendUrl}/${metadata.centerShorty}/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`;
};

export const getComtradaCineOrderMovies = async (
  cinemaId: number,
  metadata: ComtradaCineOrderMetadata,
) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<ComtradaCineOrderMovie[]>(
    `${metadata.backendUrl}/api/films`,
    {
      headers: {
        "Center-Oid": metadata.centerId,
      },
    },
  );

  if (!data) {
    throw new Error("Could not load Comtrada movies");
  }

  const movies = data.map(
    (movie) =>
      ({
        name: movie.title,
        cinemaId,
      }),
  );

  const showings = data.flatMap((movie) =>
    movie.performances.map((performance) => {
      const showingAdditionalData = [
        performance.is3D ? "3D" : "2D",
        performance.auditoriumName,
        performance.releaseTypeName,
        performance.soundSystem,
      ].filter((v): v is string => typeof v === "string" && v.length > 0);

      return {
        cinemaId,
        movieName: movie.title,
        dateTime: moment(performance.performanceDateTime).toDate(),
        bookingUrl: getTicketUrl(metadata, movie, performance),
        showingAdditionalData,
      };
    }),
  );

  return {
    movies,
    showings,
  };
};
