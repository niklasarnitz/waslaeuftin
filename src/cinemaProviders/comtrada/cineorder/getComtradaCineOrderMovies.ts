import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import {
  type ComtradaCineOrderMoviePerformance,
  type ComtradaCineOrderMovie,
} from "@waslaeuftin/cinemaProviders/comtrada/cineorder/types/ComtradaCineOrderMovie";
import moment from "moment-timezone";
import { xior } from "xior";
import { type ComtradaCineOrderMetadata, type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";

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

  const movies = data.map(
    (movie) =>
      ({
        name: movie.title,
        cinemaId,
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );

  const showings = data.flatMap((movie) =>
    movie.performances.map((performance) => {
      const showingAdditionalData = [
        performance.is3D ? "3D" : "2D",
        performance.auditoriumName,
        performance.releaseTypeName,
        performance.soundSystem,
      ].join(UIConstants.bullet);

      return {
        cinemaId,
        movieName: movie.title,
        dateTime: moment(performance.performanceDateTime).toDate(),
        bookingUrl: getTicketUrl(metadata, movie, performance),
        showingAdditionalData,
      } satisfies Prisma.Args<typeof db.showing, "create">["data"];
    }),
  );

  return {
    movies,
    showings,
  };
};
