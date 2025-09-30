import { isShowing } from "@waslaeuftin/types/guards/isShowing";
import { type Showing } from "@waslaeuftin/types/Showing";
import { load } from "cheerio";
import moment from "moment-timezone";
import { xior } from "xior";
import { type Prisma } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { isMovie } from "@waslaeuftin/types/guards/isMovie";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";

export const getKinoTicketsExpressMovies = async (
  cinemaId: number,
  slug: string,
) => {
  const xiorInstance = xior.create();
  const { data } = await xiorInstance.get<string>(
    `https://kinotickets.express/${slug}/movies`,
  );
  const $ = load(data);

  // Updated selector for the new HTML structure
  const movieContainers = $("main ul > li.bg-white");

  const rawData = Object.values(
    movieContainers.map((_, container) => {
      const container$ = load(container);

      // Extract movie title from the new structure
      const movieTitle = container$(
        ".text-xl.sm\\:text-3xl.font-bold.text-primary",
      )
        .text()
        .trim();

      // Extract movie metadata from the paragraph
      const metadataParagraph = container$("p").text();

      // Build additional data from metadata with robust handling
      const showingAdditionalData =
        metadataParagraph.length > 0
          ? metadataParagraph
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .map((line) => {
                // Handle bold tags and common patterns
                return line
                  .replace(/\s*<b>(.*?)<\/b>\s*/g, "$1") // Remove bold tags but keep content
                  .replace(/^\s*\*?\s*/, "") // Remove leading asterisks or spaces
                  .replace(/\s+/g, " ") // Collapse multiple spaces
                  .trim();
              })
              .filter(
                (line) =>
                  line.length > 0 &&
                  !line.match(/^\s*$/) &&
                  !line.includes("mt-2 flex space-x-2"),
              )
              .join(UIConstants.bullet)
          : undefined;

      // Find all showings for this movie - handle multiple formats
      const showings: unknown[] = [];

      // Method 1: Try the original format with regex (for backward compatibility)
      container$("a[href*='/booking/']").each((_, a) => {
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

        if (dateStr && timeStr) {
          try {
            const [day, month] = dateStr.split(".");
            const dateTime = moment(
              `${new Date().getFullYear()}-${month}-${day}-${timeStr}`,
              "YYYY-MM-DD-HH:mm",
            ).toDate();

            const bookingUrl = container$(a).attr("href");
            if (bookingUrl) {
              const fullBookingUrl = bookingUrl.startsWith("http")
                ? bookingUrl
                : `https://kinotickets.express${bookingUrl}`;

              showings.push({
                dateTime,
                bookingUrl: fullBookingUrl,
                showingAdditionalData,
              } satisfies Showing);
            }
          } catch (error) {
            console.warn(
              `Failed to parse showing (format 1): ${dateStr} ${timeStr}`,
              error,
            );
          }
        }
      });

      // Method 2: New HTML structure with separate date and time containers
      container$("ul li").each((_, showtimeContainer) => {
        const showtimeContainer$ = load(showtimeContainer);

        // Extract date from the date container
        const dateContainer = showtimeContainer$(".w-14, .sm\\:w-24");
        const dateStr = dateContainer.find("div").last().text().trim(); // e.g., "03.10."

        // Extract time links
        showtimeContainer$("a[href*='/booking/']").each((_, timeLink) => {
          const timeText = showtimeContainer$(timeLink).text().trim(); // e.g., "19:00"
          const bookingUrl = showtimeContainer$(timeLink).attr("href");

          if (dateStr && timeText && bookingUrl) {
            // Check if this showing was already added by method 1
            const existingShowing = showings.find(
              (showing) =>
                isShowing(showing) && showing.bookingUrl?.includes(bookingUrl),
            );

            if (!existingShowing) {
              try {
                // Parse date: "03.10." format (day.month.)
                const cleanDateStr = dateStr.replace(/\.$/, ""); // Remove trailing dot
                const dateParts = cleanDateStr.split(".");

                if (dateParts.length >= 2) {
                  const day = dateParts[0];
                  const month = dateParts[1];

                  if (day && month) {
                    // Create date with current year
                    const currentYear = new Date().getFullYear();
                    const dateTime = moment(
                      `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${timeText}`,
                      "YYYY-MM-DD HH:mm",
                    ).toDate();

                    // Ensure the URL is absolute
                    const fullBookingUrl = bookingUrl.startsWith("http")
                      ? bookingUrl
                      : `https://kinotickets.express${bookingUrl}`;

                    showings.push({
                      dateTime,
                      bookingUrl: fullBookingUrl,
                      showingAdditionalData,
                    } satisfies Showing);
                  }
                }
              } catch (error) {
                console.warn(
                  `Failed to parse showing (format 2): ${dateStr} ${timeText}`,
                  error,
                );
              }
            }
          }
        });
      });

      const filteredShowings = showings.filter((showing) => isShowing(showing));

      return {
        name: movieTitle,
        showings: filteredShowings,
        cinemaId,
      };
    }),
  ).filter((movie) => isMovie(movie) && movie.name.length > 0);

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
