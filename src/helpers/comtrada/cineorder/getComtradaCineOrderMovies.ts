import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import {
  type ComtradaCineOrderMoviePerformance,
  type ComtradaCineOrderMovie,
} from "@waslaeuftin/helpers/comtrada/cineorder/types/ComtradaCineOrderMovie";
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

const CenterIds: Record<ComtradaCineOrderCinemasType, string> = {
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

const CenterShorties: Record<ComtradaCineOrderCinemasType, string> = {
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
  cinema: ComtradaCineOrderCinemasType,
  movie: ComtradaCineOrderMovie,
  performance: ComtradaCineOrderMoviePerformance,
) => {
  switch (cinema) {
    case "zkm_karlsruhe":
      return `https://cineorder.filmpalast.net/zkm/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`;
    default:
      return `https://ts.kinopolis.de/${CenterShorties[cinema]}/movie/${encodeURI(movie.title)}/${movie.id}/performance/${performance.id}`;
  }
};

export const getComtradaCineOrderMovies = async (
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
            bookingUrl: getTicketUrl(cinema, movie, performance),
            showingAdditionalData,
          } satisfies Showing;
        }),
        cinema: Cinemas[cinema],
      }) satisfies Movie,
  );
};
