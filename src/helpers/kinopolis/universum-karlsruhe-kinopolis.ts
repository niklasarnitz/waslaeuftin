import {
  isShowing,
  type Showing,
  type Movie,
  isMovie,
  Cinemas,
  type KinopolisCinemasType,
} from "@waslaeuftin/types/Movie";
import { load } from "cheerio";
import moment from "moment";
import { xior } from "xior";

export const getKinopolisMovies = async (cinema: KinopolisCinemasType) => {
  let forumCenter = "";

  switch (cinema) {
    case "kinopolis_karlsruhe":
      forumCenter = "ka";
      break;
  }

  const xiorInstance = xior.create();

  const { data } = await xiorInstance.get<string>(
    `https://www.kinopolis.de/${forumCenter}/programm`,
  );
  const $ = load(data);

  const movieContainers = $(
    "body > main > section.page-main__content > section",
  );

  // TODO: fix this and add the right movie scraping mechanics

  return Object.values(
    movieContainers.map((_, container) => {
      const container$ = load(container);

      const showingsRows = container$("div.c.c-2 > table > tbody > tr");

      const showings: unknown[] = [];

      showingsRows.map((_, row) => {
        const row$ = load(row);

        const dateText = row$("td.day > div").text();

        if (dateText.length === 0) {
          return;
        }

        let date = new Date();
        switch (true) {
          case dateText.includes("heute"):
            date = new Date();
            break;
          case dateText.includes("morgen"):
            date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
            break;
          default:
            const parsed = dateText.match(/(\d{2}\.\d{2})/);
            if (parsed && typeof parsed[0] === "string") {
              date = moment(`${parsed[0]}.2024`, "DD.MM.YYYY")
                .add(1, "days")
                .toDate();
            } else {
              return;
            }
        }

        const showingTimes = row$("td.times > ul > li > a");

        showingTimes.map((_, time) => {
          if (
            time.children &&
            time.children.length > 0 &&
            time.children[0] &&
            "data" in time.children[0]
          ) {
            const timeData = time.children[0].data.split(":");

            const hours = Number(timeData[0]);
            const minutes = Number(timeData[1]);

            const additional$ = load(time);

            const additionalTextRaw = additional$("em").text();

            const additionalText =
              additionalTextRaw.length > 0
                ? additionalTextRaw.replaceAll("ATMOS", "Dolby Atmos")
                : undefined;

            const newShowingDate = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              hours,
              minutes,
            );

            const showing: Showing = {
              dateTime: newShowingDate,
              bookingUrl: time.attribs.href
                ? `https://www.forumcinemas.de/${time.attribs.href}`
                : undefined,
              showingAdditionalData: additionalText,
            };

            showings.push(showing);
          }
        });
      });

      return {
        name: container$(
          "div.container > div > div > div > div > h2 > a",
        ).text(),
        showings: (
          showings.filter((showing) => isShowing(showing)) as Showing[]
        ).sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
        cinema: Cinemas[cinema],
      } satisfies Movie;
    }),
  ).filter((movie) => isMovie(movie));
};
