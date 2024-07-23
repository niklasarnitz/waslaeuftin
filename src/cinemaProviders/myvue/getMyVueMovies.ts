import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import moment from "moment-timezone";
import { xior } from "xior";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { type MyVueFilm } from "@waslaeuftin/cinemaProviders/myvue/types/MyVueTypes";

export const getMyVueMovies = async (
  cinemaId: number,
  myVueCinemaId: string,
) => {
  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<{ result: MyVueFilm[] }>(
    `https://www.myvue.com/api/microservice/showings/cinemas/${myVueCinemaId}/films`,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=0, i",
        "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
      },
      credentials: "omit",
    },
  );

  const movies = data.result.map(
    (movie) =>
      ({
        name: movie.filmTitle,
        cinemaId,
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );

  const showings = data.result.flatMap((movie) =>
    movie.showingGroups.flatMap((showingGroup) =>
      showingGroup.sessions.flatMap((session) => {
        const showingAdditionalData = [
          ...session.attributes.map((attribute) => attribute.name),
          session.screenName,
        ].join(UIConstants.bullet);

        return {
          cinemaId,
          movieName: movie.filmTitle,
          dateTime: moment(session.startTime).toDate(),
          bookingUrl: `https://www.myvue.com${session.bookingUrl}`,
          showingAdditionalData,
        } satisfies Prisma.Args<typeof db.showing, "create">["data"];
      }),
    ),
  );

  return {
    movies,
    showings,
  };
};
