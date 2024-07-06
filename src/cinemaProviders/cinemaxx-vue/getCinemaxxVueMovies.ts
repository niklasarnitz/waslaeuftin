import moment from "moment-timezone";
import { type CinemaxxVueWhatsOnResponse } from "./CinemaxxVueWhatsOnResponse";
import { xior } from "xior";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";

export const getCinemaxxVueMovies = async (
  cinemaxxCinemaId: number,
  cinemaId: number,
) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<CinemaxxVueWhatsOnResponse>(
    `https://www.cinemaxx.de/api/sitecore/WhatsOn/WhatsOnV2ByTopfilms?cinemaId=${cinemaxxCinemaId}&Datum=${moment().format("DD-MM-YYYY")},${moment().add(7, "days").format("DD-MM-YYYY")}&type=jetzt-im-kino`,
  );

  const movies = data.WhatsOnAlphabeticFilms.map(
    (movie) =>
      ({
        name: movie.Title,
        cinemaId,
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );

  const showings = data.WhatsOnAlphabeticFilms.flatMap((movie) =>
    movie.WhatsOnAlphabeticCinemas.map((day) =>
      day.WhatsOnAlphabeticCinemas.map(
        (cinema) => cinema.WhatsOnAlphabeticShedules,
      ),
    )
      .flat()
      .map((schedule) =>
        schedule.map(
          (performance) =>
            ({
              dateTime: moment(performance.Time).toDate(),
              bookingUrl: `https://https://www.cinemaxx.de${performance.BookingLink}`,
              showingAdditionalData: [
                performance.VersionTitle,
                `Kino ${performance.ScreenNumber}`,
                ...movie.tags.map((tag) => tag.name),
              ].join(UIConstants.bullet),
              cinemaId,
              movieName: movie.Title,
            }) satisfies Prisma.Args<typeof db.showing, "create">["data"],
        ),
      )
      .flat(),
  );

  return {
    movies,
    showings,
  };
};
