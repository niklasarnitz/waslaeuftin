import { load } from "cheerio";
import moment from "moment-timezone";
import xior from "xior";

import type {
  ProviderMovieWithShowings,
  ProviderShowing as Showing,
} from "@waslaeuftin/validators";
import { getKinemathekIdentityDetails } from "@waslaeuftin/cinema-providers/internal/providers/kino-ticket-express/getKinemathekIdentityDetails";
import { getSchauburgIdentityDetails } from "@waslaeuftin/cinema-providers/internal/providers/kino-ticket-express/getSchauburgIdentityDetails";
import {
  ProviderMovieWithShowingsSchema,
  ProviderShowingSchema,
} from "@waslaeuftin/validators";

const BERLIN_TIMEZONE = "Europe/Berlin";

export const parseKinoTicketsExpressDateTime = (
  value: string,
  format: string,
): Date => {
  const parsedDateTime = moment.tz(value, format, BERLIN_TIMEZONE);

  if (!parsedDateTime.isValid()) {
    throw new Error(`Invalid KinoTickets Express showtime datetime: ${value}`);
  }

  return parsedDateTime.toDate();
};

const parseShowingAdditionalData = (
  metadataParagraph: string,
): string[] | undefined => {
  return metadataParagraph.length > 0
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
    : undefined;
};

const parseLegacyFormatShowings = (
  container$: ReturnType<typeof load>,
  showingAdditionalData: string[] | undefined,
  seenBookingUrls: Set<string>,
  showings: unknown[],
) => {
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
        const dateTime = parseKinoTicketsExpressDateTime(
          `${new Date().getFullYear()}-${month}-${day}-${timeStr}`,
          "YYYY-MM-DD-HH:mm",
        );

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
          seenBookingUrls.add(fullBookingUrl);
        }
      } catch (error) {
        console.warn(
          `Failed to parse showing (format 1): ${dateStr} ${timeStr}`,
          error,
        );
      }
    }
  });
};

const parseNewFormatShowings = (
  container$: ReturnType<typeof load>,
  showingAdditionalData: string[] | undefined,
  seenBookingUrls: Set<string>,
  showings: unknown[],
) => {
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
        // Ensure the URL is absolute
        const fullBookingUrl = bookingUrl.startsWith("http")
          ? bookingUrl
          : `https://kinotickets.express${bookingUrl}`;

        // Check if this showing was already added by method 1
        const existingShowing = seenBookingUrls.has(fullBookingUrl);

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
                const dateTime = parseKinoTicketsExpressDateTime(
                  `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${timeText}`,
                  "YYYY-MM-DD HH:mm",
                );

                showings.push({
                  dateTime,
                  bookingUrl: fullBookingUrl,
                  showingAdditionalData,
                } satisfies Showing);
                seenBookingUrls.add(fullBookingUrl);
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
};

export const getKinoTicketsExpressMovies = async (
  cinemaId: number,
  slug: string,
) => {
  const xiorInstance = xior.create();
  const { data } = await xiorInstance.get<string>(
    `https://kinotickets.express/${slug}/movies`,
  );

  if (!data) {
    throw new Error("Could not load KinoTickets Express movies");
  }

  const $ = load(data);

  // Updated selector for the new HTML structure
  const movieContainers = $("main ul > li.bg-white");
  const breakfastFilmTitles = new Map<string, string>();

  const rawData = Object.values(
    movieContainers.map((_, container): ProviderMovieWithShowings => {
      const container$ = load(container);

      // Extract movie title from the new structure
      const movieTitle = container$(
        ".text-xl.sm\\:text-3xl.font-bold.text-primary",
      ).text();
      const providerFilmId = /^movie-(\d+)$/.exec(
        container$(container).attr("id") ?? "",
      )?.[1];
      const breakfastTitle = /^\s*Frühstück\s*[:-]\s*(.+)$/i.exec(
        movieTitle,
      )?.[1];
      const description = container$(container).text();
      if (
        slug === "karlsruhe_schauburg" &&
        providerFilmId &&
        breakfastTitle &&
        /Frühstücksbuffet/i.test(description) &&
        /sehen Sie dann einen der drei Filme/i.test(description)
      ) {
        breakfastFilmTitles.set(
          providerFilmId,
          breakfastTitle.trim().toLowerCase(),
        );
      }

      // Extract movie metadata from the paragraph
      const metadataParagraph = container$("p").text();
      const metadata = new Map<string, string>();
      container$("p b").each((_, label) => {
        const value = label.nextSibling;
        if (value) {
          metadata.set(
            container$(label).text().trim(),
            container$(value).text().trim(),
          );
        }
      });
      const year = metadata.get("Produktion:") ?? "";
      const productionYear = /^\d{4}$/.test(year) ? Number(year) : undefined;
      const runtime = /^(?:ca\.\s*)?([1-9]\d*)\s+Minuten$/.exec(
        metadata.get("Laufzeit:") ?? "",
      );
      const runtimeMinutes = runtime ? Number(runtime[1]) : undefined;
      const evidence = {
        ...(productionYear && productionYear >= 1800 && productionYear <= 2100
          ? { productionYear }
          : {}),
        ...(runtimeMinutes &&
        Number.isSafeInteger(runtimeMinutes) &&
        !breakfastFilmTitles.has(providerFilmId ?? "")
          ? { runtimeMinutes }
          : {}),
      };

      // Build additional data from metadata with robust handling
      const showingAdditionalData =
        parseShowingAdditionalData(metadataParagraph);

      // Find all showings for this movie - handle multiple formats
      const showings: unknown[] = [];
      const seenBookingUrls = new Set<string>();

      // Method 1: Try the original format with regex (for backward compatibility)
      parseLegacyFormatShowings(
        container$,
        showingAdditionalData,
        seenBookingUrls,
        showings,
      );

      // Method 2: New HTML structure with separate date and time containers
      parseNewFormatShowings(
        container$,
        showingAdditionalData,
        seenBookingUrls,
        showings,
      );

      const filteredShowings = showings.filter(
        (showing): showing is Showing =>
          ProviderShowingSchema.safeParse(showing).success,
      );

      return {
        name: movieTitle,
        showings: filteredShowings,
        cinemaId,
        providerFilmId,
        ...(Object.keys(evidence).length ? { evidence } : {}),
      };
    }),
  ).filter(
    (movie): movie is ProviderMovieWithShowings =>
      ProviderMovieWithShowingsSchema.safeParse(movie).success &&
      movie.name.trim().length > 0,
  );

  const details =
    slug === "karlsruhe_kinemathek"
      ? await getKinemathekIdentityDetails(rawData)
      : await getSchauburgIdentityDetails(
          slug === "karlsruhe_schauburg" ? rawData : [],
        );
  for (const movie of rawData) {
    const detail = details.get(movie.providerFilmId ?? "");
    if (detail) movie.evidence = { ...detail.evidence, ...movie.evidence };
  }

  const linkedDetailUrls = new Map<string, Set<string>>();
  for (const movie of rawData) {
    const filmTitle = breakfastFilmTitles.get(movie.providerFilmId ?? "");
    if (!filmTitle) continue;
    // The combination duration includes breakfast. Only a unique, complete
    // ordinary-film title (including version tags) can supply film evidence.
    const films = rawData.filter(
      (film) =>
        !breakfastFilmTitles.has(film.providerFilmId ?? "") &&
        film.name.trim().toLowerCase() === filmTitle,
    );
    const film = films.length === 1 ? films[0] : undefined;
    if (
      film?.evidence?.productionYear &&
      film.evidence.runtimeMinutes &&
      (!movie.evidence?.productionYear ||
        movie.evidence.productionYear === film.evidence.productionYear)
    ) {
      // Keep each page's own credit claim. Only an independently shared
      // trailer permits alternative claims to travel between these records.
      const movieDetail = details.get(movie.providerFilmId ?? "");
      const filmDetail = details.get(film.providerFilmId ?? "");
      if (
        movie.providerFilmId &&
        film.providerFilmId &&
        movieDetail &&
        filmDetail &&
        movie.evidence?.director &&
        film.evidence.director &&
        movie.evidence.director !== film.evidence.director &&
        movieDetail.evidence.youtubeTrailerIds?.some((id) =>
          filmDetail.evidence.youtubeTrailerIds?.includes(id),
        )
      ) {
        const claims = [
          ...new Set([
            movie.evidence.director,
            ...(movie.evidence.directorAlternatives ?? []),
            film.evidence.director,
            ...(film.evidence.directorAlternatives ?? []),
          ]),
        ];
        movie.evidence.directorAlternatives = claims.filter(
          (claim) => claim !== movie.evidence?.director,
        );
        film.evidence.directorAlternatives = claims.filter(
          (claim) => claim !== film.evidence?.director,
        );
        for (const [id, url] of [
          [movie.providerFilmId, filmDetail.url],
          [film.providerFilmId, movieDetail.url],
        ] as const) {
          const urls = linkedDetailUrls.get(id) ?? new Set<string>();
          urls.add(url);
          linkedDetailUrls.set(id, urls);
        }
      }
      const filmEvidence = { ...film.evidence };
      delete filmEvidence.directorAlternatives;
      movie.evidence = { ...filmEvidence, ...movie.evidence };
    }
  }

  const movies = rawData.map((movie) => ({
    name: movie.name,
    cinemaId,
    provider: "KinoTicketsExpress",
    providerFilmId: movie.providerFilmId,
    ...(movie.evidence ? { evidence: movie.evidence } : {}),
    ...(details.has(movie.providerFilmId ?? "")
      ? {
          sourceMetadata: {
            identityDetailsUrl: details.get(movie.providerFilmId ?? "")!.url,
            ...(linkedDetailUrls.has(movie.providerFilmId ?? "")
              ? {
                  linkedIdentityDetailsUrls: [
                    ...linkedDetailUrls.get(movie.providerFilmId ?? "")!,
                  ],
                }
              : {}),
          },
        }
      : {}),
  }));

  const showings = rawData.flatMap((movie) =>
    movie.showings.map((showing) => ({
      cinemaId,
      movieName: movie.name,
      provider: "KinoTicketsExpress",
      providerFilmId: movie.providerFilmId,
      ...(movie.evidence ? { evidence: movie.evidence } : {}),
      ...(details.has(movie.providerFilmId ?? "")
        ? {
            sourceMetadata: {
              identityDetailsUrl: details.get(movie.providerFilmId ?? "")!.url,
              ...(linkedDetailUrls.has(movie.providerFilmId ?? "")
                ? {
                    linkedIdentityDetailsUrls: [
                      ...linkedDetailUrls.get(movie.providerFilmId ?? "")!,
                    ],
                  }
                : {}),
            },
          }
        : {}),
      dateTime: moment(showing.dateTime).toDate(),
      bookingUrl: showing.bookingUrl,
      showingAdditionalData: showing.showingAdditionalData?.filter(
        (d) => d !== "Trailer",
      ),
    })),
  );

  return {
    provider: "KinoTicketsExpress",
    movies,
    showings,
  };
};
