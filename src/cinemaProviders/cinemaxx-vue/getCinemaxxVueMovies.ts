import moment from "moment-timezone";
import { type CinemaxxVueWhatsOnResponse } from "./CinemaxxVueWhatsOnResponse";
import { xior } from "xior";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";

export const getCinemaxxVueMovies = async (cinemaId: number) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<CinemaxxVueWhatsOnResponse>(
    `https://www.cinemaxx.de/api/sitecore/WhatsOn/WhatsOnV2ByTopfilms?cinemaId=${cinemaId}&Datum=${moment().format("DD-MM-YYYY")},${moment().add(7, "days").format("DD-MM-YYYY")}&type=jetzt-im-kino`,
  );

  return data.WhatsOnAlphabeticFilms.map(
    (movie) =>
      ({
        name: movie.Title,
        cinemaId: cinemaId,
        showings: {
          createMany: {
            data: movie.WhatsOnAlphabeticCinemas.map((day) =>
              day.WhatsOnAlphabeticCinemas.map(
                (cinema) => cinema.WhatsOnAlphabeticShedules,
              ),
            )
              .flat()
              .map((schedule) =>
                schedule.map((performance) => ({
                  dateTime: moment(performance.Time).toDate(),
                  bookingUrl: `https://https://www.cinemaxx.de${performance.BookingLink}`,
                  showingAdditionalData: [
                    performance.VersionTitle,
                    `Kino ${performance.ScreenNumber}`,
                    ...movie.tags.map((tag) => tag.name),
                  ].join(UIConstants.bullet),
                })),
              )
              .flat(),
          },
        },
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );
};
