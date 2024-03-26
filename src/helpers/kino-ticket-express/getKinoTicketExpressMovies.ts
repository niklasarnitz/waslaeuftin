import {
  isShowing,
  type Showing,
  type Movie,
  isMovie,
  Cinemas,
  type KinoTicketsExpressCinemasType,
} from "@waslaeuftin/types/Movie";
import axios from "axios";
import { load } from "cheerio";
import moment from "moment";

export const getKinoTicketsExpressMovies = async (
  cinema: KinoTicketsExpressCinemasType,
) => {
  const { data } = await axios.get<string>(
    `https://kinotickets.express/${cinema}/movies`,
  );
  const $ = load(data);

  const movieContainers = $("body > main > div > div > div > ul > li");

  return Object.values(
    movieContainers.map((_, container) => {
      const container$ = load(container);

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
            `2024-${dateText[1]}-${dateText[0]}-${Number(timeText[0]) + 1}:${timeText[1]}`,
            "YYYY-MM-DD-HH:mm",
          ).toDate(),
          bookingUrl: dateContainerInner$("div.flex-wrap>a").attr("href")
            ? `https://kinotickets.express${dateContainerInner$("div.flex-wrap>a").attr("href")}`
            : undefined,
        });
      });

      const filteredShowing = (
        showings.filter((showing) => isShowing(showing)) as Showing[]
      ).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      return {
        name: container$("div.mb-2").text(),
        format: container$("div.order-4>div").text(),
        showings: filteredShowing,
        cinema: Cinemas[cinema],
      } as Movie;
    }),
  ).filter((movie) => isMovie(movie));
};
