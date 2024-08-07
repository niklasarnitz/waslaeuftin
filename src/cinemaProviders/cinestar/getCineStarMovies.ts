import {
  type CineStarEventType,
  type CineStarAttribute,
} from "@waslaeuftin/cinemaProviders/cinestar/CinestarTypes";
import { xior } from "xior";
import { ArrayHelper, type URecord } from "@ainias42/js-helper";
import moment from "moment-timezone";
import { type Prisma } from "@prisma/client";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import { type db } from "@waslaeuftin/server/db";

export const getCineStarMovies = async (
  cinemaId: number,
  cinestarCinemaId: number,
) => {
  const xiorInstance = xior.create();

  const { data: rawAttributes } = await xiorInstance.get<CineStarAttribute[]>(
    "https://www.cinestar.de/api/attribute",
  );

  const attributes = rawAttributes
    .filter((attribute) => !!attribute.name && attribute.name.length > 0)
    .reduce(
      (acc, attribute) => {
        acc[attribute.id] = attribute;
        return acc;
      },
      {} as URecord<string, CineStarAttribute>,
    );

  const { data } = await xiorInstance.get<CineStarEventType[]>(
    `https://www.cinestar.de/api/cinema/${cinestarCinemaId}/show/`,
  );

  const movies = data.map(
    (movie) =>
      ({
        name: movie.title,
        cinemaId,
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );

  const showings = data.map((movie) =>
    movie.showtimes.map(
      (showtime) =>
        ({
          cinemaId,
          movieName: movie.title,
          dateTime: moment(showtime.datetime).subtract(2, "hours").toDate(),
          bookingUrl: "https://www.cinestar.de/",
          showingAdditionalData: ArrayHelper.noUndefined(
            showtime.attributes.map((attribute) => attributes[attribute]),
          )
            .map((attribute) => attribute.name)
            .join(UIConstants.bullet),
        }) satisfies Prisma.Args<typeof db.showing, "create">["data"],
    ),
  );

  return {
    movies,
    showings,
  };
};
