import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import {
  type ComtradaCineOrderMoviePerformance,
  type ComtradaCineOrderMovie,
} from "@waslaeuftin/cinemaProviders/comtrada/cineorder/types/ComtradaCineOrderMovie";
import { type Showing } from "@waslaeuftin/types/Showing";
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

  return data.map(
    (movie) =>
      ({
        name: movie.title,
        showings: {
          createMany: {
            data: movie.performances.map((performance) => {
              const showingAdditionalData = [
                performance.is3D ? "3D" : "2D",
                performance.auditoriumName,
                performance.releaseTypeName,
                performance.soundSystem,
              ].join(UIConstants.bullet);

              return {
                dateTime: moment(performance.performanceDateTime).toDate(),
                bookingUrl: getTicketUrl(metadata, movie, performance),
                showingAdditionalData,
              } satisfies Showing;
            }),
          },
        },
        cinema: {
          connect: {
            id: cinemaId,
          },
        },
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );
};
