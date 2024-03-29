import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import {
  type ComtradaCineOrderMoviePerformance,
  type ComtradaCineOrderMovie,
} from "@waslaeuftin/helpers/comtrada/cineorder/types/ComtradaCineOrderMovie";
import { type Showing } from "@waslaeuftin/types/Showing";
import moment from "moment-timezone";
import { xior } from "xior";
import { type ComtradaCineOrderMetadata, type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { type ComtradaCineOrderCinemasType } from "@waslaeuftin/types/ComtradaCineOrderCinemas";
export const CineOrderUrls: Record<ComtradaCineOrderCinemasType, string> = {
  universum_karlsruhe: "https://ts.kinopolis.de",
  zkm_karlsruhe: "https://cineorder.filmpalast.net",
  kinopolis_rosenheim: "https://ts.kinopolis.de",
  mathaeser_filmpalast: "https://ts.kinopolis.de",
  kinopolis_koblenz: "https://ts.kinopolis.de",
  kinopolis_bad_godesberg: "https://ts.kinopolis.de",
  kinopolis_landshut: "https://ts.kinopolis.de",
  citydome_darmstadt: "https://ts.kinopolis.de",
  kinopolis_darmstadt: "https://ts.kinopolis.de",
  kinopolis_freiberg: "https://ts.kinopolis.de",
  gloria_palast_münchen: "https://ts.kinopolis.de",
  kinopolis_hanau: "https://ts.kinopolis.de",
  kinopolis_gießen: "https://ts.kinopolis.de",
  kinopolis_bad_homburg: "https://ts.kinopolis.de",
};
export const CenterIds: Record<ComtradaCineOrderCinemasType, string> = {
  universum_karlsruhe: "19210000014PLXMQDD",
  zkm_karlsruhe: "6F000000014BHGWDVI",
  kinopolis_rosenheim: "10000000014VEGOZTB",
  mathaeser_filmpalast: "20000000014TTMBFYG",
  kinopolis_koblenz: "50000000014MHWBOTF",
  kinopolis_bad_godesberg: "20000000014VEGOZTB",
  kinopolis_landshut: "40000000014MHWBOTF",
  citydome_darmstadt: "20000000014KGIVNZB",
  kinopolis_darmstadt: "20000000014SPADYMD",
  kinopolis_freiberg: "20000000014NGRSDLK",
  gloria_palast_münchen: "30000000014AOPKLEM",
  kinopolis_hanau: "BE830000014PLXMQDD",
  kinopolis_gießen: "DE830000014PLXMQDD",
  kinopolis_bad_homburg: "5F830000014PLXMQDD",
};

export const CenterShorties: Record<ComtradaCineOrderCinemasType, string> = {
  universum_karlsruhe: "ka",
  zkm_karlsruhe: "zkm",
  kinopolis_rosenheim: "ro",
  mathaeser_filmpalast: "mm",
  kinopolis_koblenz: "ko",
  kinopolis_bad_godesberg: "bn",
  kinopolis_landshut: "ls",
  citydome_darmstadt: "cd",
  kinopolis_darmstadt: "kp",
  kinopolis_freiberg: "fr",
  gloria_palast_münchen: "gp",
  kinopolis_hanau: "hu",
  kinopolis_gießen: "kg",
  kinopolis_bad_homburg: "bh",
};

const getTicketUrl = (
  metadata: ComtradaCineOrderMetadata,
  movie: ComtradaCineOrderMovie,
  performance: ComtradaCineOrderMoviePerformance,
) => {
  if (metadata.backendUrl.includes("filmpalast.net")) {
    return `https://cineorder.filmpalast.net/zkm/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`;
  }

  return `https://ts.kinopolis.de/${metadata.centerShorty}/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`;
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
