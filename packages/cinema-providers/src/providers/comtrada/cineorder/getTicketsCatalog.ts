import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import { fetchProgramme } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/publicProgramme";

const ZONE = "Europe/Berlin";
const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/** Resolve the year from the page's week, not the machine's local timezone. */
const readDate = (label: string, anchor: moment.Moment) => {
  const match =
    /^(?:(So|Mo|Di|Mi|Do|Fr|Sa)\.,?\s*)?(\d{2})\.(\d{2})\.(?:(\d{4}|\d{2})\.?)?$/.exec(
      label,
    );
  if (!match) throw new Error(`Invalid tickets date: ${label}`);
  const [, weekday, day, month, suppliedYear] = match;
  let year = suppliedYear
    ? Number(suppliedYear) + (suppliedYear.length === 2 ? 2000 : 0)
    : anchor.year();
  // A ten-day table can straddle New Year, and presale notices can name January.
  if (!suppliedYear && Number(month) - (anchor.month() + 1) < -6) year++;
  if (!suppliedYear && Number(month) - (anchor.month() + 1) > 6) year--;
  const date = moment.tz(`${day}.${month}.${year}`, "DD.MM.YYYY", true, ZONE);
  if (!date.isValid() || (weekday && WEEKDAYS[date.day()] !== weekday))
    throw new Error(`Invalid tickets date: ${label}`);
  return date;
};

export const getTicketsCatalog = async (
  cinemaId: number,
  baseUrl: string,
  centerId: string,
): Promise<ProviderCatalog> => {
  const site = new URL(baseUrl);
  const host = site.hostname.replace(/^www\./, "");
  if (
    site.protocol !== "https:" ||
    site.port ||
    site.username ||
    site.password ||
    !centerId.trim()
  )
    throw new Error(`Invalid tickets source: ${baseUrl}`);
  const bookingOrigin = `https://iframe.cineorder.${host}`;
  const source = new URL("/tickets/", site);
  const today = moment.tz(ZONE).startOf("day");
  let url = source;
  let pageStart = today.clone();
  let lastAdvertisedDay = today.clone();
  const catalog: ProviderCatalog = { movies: [], showings: [] };
  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const seen = new Map<string, { filmId: string; time: number }>();

  // Both sites render ten days at a time, advancing by seven. Presale notices
  // name later dates even on otherwise empty weeks (Weil supplies no link).
  // Visit every intervening week, then stop at an empty, unadvertised week.
  for (let page = 0; ; page++) {
    if (page >= 104)
      throw new Error(`Tickets programme exceeds two years: ${baseUrl}`);
    const $ = await fetchProgramme(url.href);
    const tables = $(".program-table-wrapper table");
    if (tables.length === 0)
      throw new Error(`Missing tickets programme table: ${url.href}`);
    let parsedLinks = 0;
    for (const table of tables.toArray()) {
      let dates: moment.Moment[] = [];
      for (const row of $(table).find("tr").toArray()) {
        const $row = $(row);
        if ($row.hasClass("header-row")) {
          const headers = $row.find("th .program-table-row > div").toArray();
          if (headers.length === 0)
            throw new Error(`Missing tickets date columns: ${url.href}`);
          dates = [];
          for (const header of headers) {
            const label = $(header).text().trim();
            const date =
              label === "Heute"
                ? today.clone()
                : label === "Morgen"
                  ? today.clone().add(1, "day")
                  : readDate(label, dates.at(-1) ?? pageStart);
            const previous = dates.at(-1);
            if (previous && date.diff(previous, "days") !== 1)
              throw new Error(`Nonconsecutive tickets dates: ${url.href}`);
            dates.push(date);
          }
          continue;
        }

        for (const info of $row.find(".program-table-row-info").toArray()) {
          const label = $(info).text().replace(/\s+/g, " ").trim();
          const match = /^Ab \S+, (\d{2}\.\d{2}\.\d{2}(?:\d{2})?)$/.exec(label);
          if (!match?.[1])
            throw new Error(`Invalid tickets presale notice: ${label}`);
          const date = readDate(match[1], pageStart);
          if (date.isAfter(lastAdvertisedDay)) lastAdvertisedDay = date;
        }
        if ($row.find("a.schedule-link").length === 0) continue;
        if (dates.length === 0)
          throw new Error(
            `Tickets screening precedes date header: ${url.href}`,
          );
        const detail = $row.children("td").first().find("h4 a");
        const detailUrl = new URL(detail.attr("href") ?? "", source);
        const filmId =
          /^\/film\/[^/]+\/([\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12})\/$/i
            .exec(detailUrl.pathname)?.[1]
            ?.toLowerCase();
        const name = detail.text().trim();
        if (
          detail.length !== 1 ||
          detailUrl.origin !== source.origin ||
          !filmId ||
          !name
        )
          throw new Error(`Invalid tickets film identity: ${url.href}`);
        let movie = movies.get(filmId);
        if (!movie) {
          movie = {
            cinemaId,
            name,
            provider: "ComtradaCineOrder",
            providerFilmId: filmId,
          };
          movies.set(filmId, movie);
          catalog.movies.push(movie);
        } else if (movie.name !== name) {
          throw new Error(`Conflicting tickets film title: ${filmId}`);
        }
        let rowLinks = 0;
        for (const schedule of $row
          .children("td")
          .find(".program-table-row:not(.program-table-row-info)")
          .toArray()) {
          const columns = $(schedule).children("div").toArray();
          if (columns.length !== dates.length)
            throw new Error(`Misaligned tickets date columns: ${url.href}`);
          const presentation = $(schedule)
            .prevAll(".program-table-title")
            .first()
            .text()
            .trim();
          for (const [index, column] of columns.entries()) {
            for (const link of $(column).find("a.schedule-link").toArray()) {
              const href = $(link).attr("href");
              const booking = new URL(href ?? "", source);
              const performance = booking.searchParams.get("performance");
              if (
                !href ||
                booking.origin !== bookingOrigin ||
                booking.username ||
                booking.password ||
                booking.pathname !== "/landingpage" ||
                booking.searchParams.getAll("center").length !== 1 ||
                booking.searchParams.get("center") !== centerId ||
                booking.searchParams.getAll("performance").length !== 1 ||
                !performance?.trim()
              )
                throw new Error(`Invalid tickets booking link: ${href}`);
              const time = $(link).text().trim();
              const day = dates[index];
              const date = moment.tz(
                `${day?.format("YYYY-MM-DD")} ${time}`,
                "YYYY-MM-DD HH:mm",
                true,
                ZONE,
              );
              if (
                !/^\d{2}:\d{2}$/.test(time) ||
                !date.isValid() ||
                date.format("HH:mm") !== time
              )
                throw new Error(`Invalid tickets screening time: ${time}`);
              parsedLinks++;
              rowLinks++;
              const previous = seen.get(performance);
              if (previous) {
                if (
                  previous.filmId !== filmId ||
                  previous.time !== date.valueOf()
                )
                  throw new Error(
                    `Conflicting tickets screening: ${performance}`,
                  );
                continue;
              }
              seen.set(performance, { filmId, time: date.valueOf() });
              catalog.showings.push({
                cinemaId,
                movieName: movie.name,
                provider: movie.provider,
                providerFilmId: filmId,
                providerSessionId: performance,
                dateTime: date.toDate(),
                bookingUrl: booking.href,
                showingAdditionalData: presentation ? [presentation] : [],
              });
            }
          }
        }
        if (rowLinks !== $row.find("a.schedule-link").length)
          throw new Error(`Unassociated tickets screening: ${url.href}`);
      }
    }
    if (parsedLinks !== $("a.schedule-link").length)
      throw new Error(`Unassociated tickets screening: ${url.href}`);
    if (parsedLinks === 0 && !pageStart.isBefore(lastAdvertisedDay)) break;
    const nextStart = pageStart.clone().add(1, "week");
    let nextUrl: URL | undefined;
    for (const link of $(".program-table-navbar a[href]").toArray()) {
      const candidate = new URL($(link).attr("href") ?? "", source);
      const start = candidate.searchParams.get("filterStart");
      if (!start) continue;
      if (
        candidate.origin !== source.origin ||
        candidate.pathname !== source.pathname ||
        candidate.searchParams.getAll("filterStart").length !== 1 ||
        !/^\d+$/.test(start) ||
        Number(start) !== nextStart.unix()
      )
        throw new Error(`Invalid tickets week navigation: ${candidate.href}`);
      nextUrl = candidate;
    }
    if (!nextUrl) {
      if (lastAdvertisedDay.isAfter(pageStart))
        throw new Error(`Missing tickets presale navigation: ${url.href}`);
      break;
    }
    url = nextUrl;
    pageStart = nextStart;
  }
  if (catalog.showings.length === 0)
    throw new Error(`No tickets screenings found: ${source.href}`);
  return catalog;
};
