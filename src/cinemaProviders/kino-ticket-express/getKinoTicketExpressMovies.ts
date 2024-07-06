import { isShowing } from "@waslaeuftin/types/guards/isShowing";
import { type Showing } from "@waslaeuftin/types/Showing";
import { load } from "cheerio";
import moment from "moment-timezone";
import { xior } from "xior";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { isMovie } from "@waslaeuftin/types/guards/isMovie";

export const getKinoTicketsExpressMovies = async (
  cinemaId: number,
  slug: string,
) => {
  const xiorInstance = xior.create();
  const { data } = await xiorInstance.get<string>(
    `https://kinotickets.express/${slug}/movies`,
  );
  const $ = load(data);

  const movieContainers = $("body > main > div > div > div > ul > li");

  const rawData = Object.values(
    movieContainers.map((_, container) => {
      const container$ = load(container);

      const additionalShowingsDataRaw = container$(
        "div.space-x-2 > div",
      ).text();

      const showingAdditionalData =
        additionalShowingsDataRaw.length > 0
          ? additionalShowingsDataRaw
          : undefined;

      const dateContainer = container$("li > ul > li");

      const showings: unknown[] = [];

      dateContainer.map((_, dateContainerInner) => {
        const dateContainerInner$ = load(dateContainerInner);
        const dateText = dateContainerInner$("div.w-14>div:last-child")
          .text()
          .split(".")
          .filter((t) => !t.includes("\n"));
        const timeText = dateContainerInner$("div.flex-wrap>a")
          .text()
          .split(":")
          .map((t) => t.replaceAll("\n", "").trim());

        showings.push({
          dateTime: moment(
            `2024-${dateText[1]}-${dateText[0]}-${timeText[0]}:${timeText[1]}`,
            "YYYY-MM-DD-HH:mm",
          ).toDate(),
          bookingUrl: dateContainerInner$("div.flex-wrap>a").attr("href")
            ? `https://kinotickets.express${dateContainerInner$("div.flex-wrap>a").attr("href")}`
            : undefined,
          showingAdditionalData,
        } satisfies Showing);
      });

      const filteredShowings = showings.filter((showing) => isShowing(showing));

      return {
        name: container$("div.mb-2").text(),
        showings: filteredShowings,
        cinemaId,
      };
    }),
  ).filter((movie) => isMovie(movie));

  const movies = rawData.map((movie) => ({
    name: movie.name,
    cinemaId,
  })) satisfies Prisma.Args<typeof db.movie, "createMany">["data"];

  const showings = rawData.flatMap((movie) =>
    movie.showings.map((showing) => ({
      cinemaId,
      movieName: movie.name,
      dateTime: moment(showing.dateTime).toDate(),
      bookingUrl: showing.bookingUrl,
      showingAdditionalData: showing.showingAdditionalData,
    })),
  ) satisfies Prisma.Args<typeof db.showing, "createMany">["data"];

  return {
    movies,
    showings,
  };
};
