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

  const movieContainers = $("main ul > li");

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

      // Find all showings for this movie (date and time with booking link)
      const showings: unknown[] = [];
      container$("a[href^='/" + slug + "/booking/']").each((_, a) => {
        const text = container$(a).text();
        // Example: 'Heute 16.06.[21:00]' or 'So 22.06.[15:00]'
        const regex = /([A-Za-z]+)?\s?(\d{2}\.\d{2}\.)?\[(\d{2}:\d{2})]/;
        const match = regex.exec(text);
        let dateStr = null;
        let timeStr = null;
        if (match) {
          dateStr = match[2] ? match[2].replace(/\.$/, "") : null; // e.g. '16.06'
          timeStr = match[3]; // e.g. '21:00'
        }
        // Fallback: try to get date from previous text node or parent
        // For now, assume current year
        let dateTime: Date;
        if (dateStr && timeStr) {
          const [day, month] = dateStr.split(".");
          dateTime = moment(
            `${new Date().getFullYear()}-${month}-${day}-${timeStr}`,
            "YYYY-MM-DD-HH:mm",
          ).toDate();

          showings.push({
            dateTime,
            bookingUrl: `https://kinotickets.express${container$(a).attr("href")}`,
            showingAdditionalData,
          } satisfies Showing);
        }
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
