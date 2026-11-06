import { load } from "cheerio";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://www.megaplex.at";
const TIME_ZONE = "Europe/Vienna";
const SLUGS = ["linz", "stpoelten", "gasometer", "scn", "metropol"];
type Data = Record<string, unknown>;

const object = (value: unknown): Data => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Megaplex: invalid structured programme");
  return value as Data;
};
const clean = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const localDate = (value: string) => {
  const wall = moment.utc(value, "YYYY-MM-DDTHH:mm:ss", true);
  if (!wall.isValid()) throw new Error("Megaplex: invalid screening time");
  const zone = moment.tz.zone(TIME_ZONE)!;
  const candidates = [...new Set(zone.offsets)]
    .map((offset) => wall.valueOf() + offset * 60_000)
    .filter(
      (instant) =>
        moment.tz(instant, TIME_ZONE).format("YYYY-MM-DDTHH:mm:ss") === value,
    );
  if (candidates.length !== 1)
    throw new Error("Megaplex: ambiguous or nonexistent screening time");
  return new Date(candidates[0]!);
};

/** Public programme and film pages only; never follows checkout links. */
export const getMegaplexMovies = async (
  cinemaId: number,
  slug: string,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  if (!Number.isSafeInteger(cinemaId) || cinemaId <= 0 || !SLUGS.includes(slug))
    throw new Error("Megaplex: invalid cinema configuration");
  const read = async (url: string) => {
    const response = await request(url, { Accept: "text/html" });
    if (response.status !== 200)
      throw new Error(`Megaplex: ${describeFailedResponse(response)}`);
    return load(response.body);
  };
  const programmeUrl = `${ORIGIN}/kinoprogramm/${slug}`;
  // Metropol shares the Megaplex programme, but identifies its own domain in
  // MovieTheater and ScreeningEvent metadata, including on megaplex.at pages.
  const theatreUrl =
    slug === "metropol"
      ? "https://www.metropol-kino.at/kinoprogramm/metropol"
      : programmeUrl;
  const programme = await read(programmeUrl);
  const filmUrls = new Set<string>();
  for (const element of programme("a[href]").toArray()) {
    const url = new URL(programme(element).attr("href")!, ORIGIN);
    if (
      url.origin === ORIGIN &&
      new RegExp(`^/film/${slug}/[a-z0-9-]+/?$`).test(url.pathname) &&
      !url.search
    )
      filmUrls.add(url.href.replace(/\/$/, ""));
  }
  if (!filmUrls.size) throw new Error("Megaplex: missing cinema programme");

  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const sessions = new Map<string, ProviderCatalog["showings"][number]>();
  const fetchedAt = new Date().toISOString();
  for (const filmUrl of filmUrls) {
    const $ = await read(filmUrl);
    const nodes = $("script[type='application/ld+json']")
      .toArray()
      .flatMap((element) => {
        const value: unknown = JSON.parse($(element).text());
        const node = object(value);
        return Array.isArray(node["@graph"])
          ? node["@graph"].map(object)
          : [node];
      });
    const events = nodes.filter((node) => node["@type"] === "ScreeningEvent");
    const anchors = $(".day-group a[href^='/ticket/']");
    const film = nodes.find(
      (node) => node["@type"] === "Movie" && node["@id"] === `${filmUrl}#movie`,
    );
    if (!film || !clean(film.name))
      throw new Error(`Megaplex: incomplete film programme at ${filmUrl}`);
    const theatre = nodes.find((node) => node["@type"] === "MovieTheater");
    if (theatre?.url !== theatreUrl)
      throw new Error("Megaplex: film belongs to another cinema");
    // Only a validated film page can be an advance release. An HTTP-200 error
    // page must abort the refresh, not withdraw that film's existing listings.
    if (!anchors.length && !events.length) continue;
    // The site caps ScreeningEvent JSON-LD at 20, but HTML contains the full
    // week. Dates and booking links come from HTML; cross-check supplied events.
    if (!anchors.length || events.length > anchors.length)
      throw new Error(`Megaplex: incomplete film programme at ${filmUrl}`);
    const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(clean(film.duration));
    const runtime = duration
      ? Number(duration[1] ?? 0) * 60 + Number(duration[2] ?? 0)
      : undefined;
    const directors = film.director
      ? (Array.isArray(film.director) ? film.director : [film.director])
          .map((person) => clean(object(person).name))
          .filter(Boolean)
          .join(" / ")
      : undefined;
    const evidence = {
      director: directors || undefined,
      runtimeMinutes: runtime && runtime > 0 ? runtime : undefined,
    };

    let index = 0;
    for (const group of $(".day-group").toArray()) {
      const heading = clean($(group).find("h3").first().text());
      const explicit = /(\d{2})\.(\d{2})\.(\d{4})/.exec(heading);
      const day = explicit
        ? `${explicit[3]}-${explicit[2]}-${explicit[1]}`
        : /^(Heute|Morgen)$/.test(heading)
          ? moment()
              .tz(TIME_ZONE)
              .add(heading === "Morgen" ? 1 : 0, "day")
              .format("YYYY-MM-DD")
          : undefined;
      const links = $(group).find("a[href^='/ticket/']").toArray();
      if (links.length && !day)
        throw new Error("Megaplex: missing screening date");
      for (const element of links) {
        const anchor = $(element);
        const event = events[index++];
        const time = /^(\d{2}:\d{2})(?:\s*\*)?$/.exec(
          clean(anchor.attr("title")),
        )?.[1];
        const start = `${day}T${time}:00`;
        const bookingUrl = new URL(anchor.attr("href")!, ORIGIN);
        const ids = /^\/ticket\/([1-9]\d*)\/([1-9]\d*)$/.exec(
          bookingUrl.pathname,
        );
        if (
          !ids ||
          bookingUrl.origin !== ORIGIN ||
          !time ||
          (event &&
            (event.startDate !== start ||
              object(event.location).url !== theatreUrl ||
              object(event.workPresented)["@id"] !== `${filmUrl}#movie`))
        )
          throw new Error(`Megaplex: screening/booking mismatch at ${filmUrl}`);
        const filmId = ids[1]!;
        const sessionId = `${slug}:${ids[2]!}`;
        const name = clean(film.name);
        const movie = {
          cinemaId,
          name,
          provider: "Megaplex",
          providerFilmId: filmId,
          evidence,
          sourceMetadata: { sourceUrl: filmUrl, fetchedAt },
        };
        const previousMovie = movies.get(filmId);
        if (previousMovie && previousMovie.name !== name)
          throw new Error("Megaplex: conflicting film identity");
        movies.set(filmId, movie);
        const showing = {
          ...movie,
          movieName: name,
          providerSessionId: sessionId,
          dateTime: localDate(start),
          bookingUrl: bookingUrl.href,
          showingAdditionalData: [
            clean(anchor.find(".card-highlights-content-time-kino").text()),
          ].filter(Boolean),
          sourceMetadata: { sourceUrl: filmUrl, fetchedAt, localStart: start },
        };
        const previous = sessions.get(sessionId);
        if (
          previous &&
          (previous.providerFilmId !== filmId ||
            previous.dateTime.getTime() !== showing.dateTime.getTime() ||
            previous.bookingUrl !== showing.bookingUrl)
        )
          throw new Error("Megaplex: conflicting session identity");
        sessions.set(sessionId, showing);
      }
    }
  }
  if (!sessions.size) throw new Error("Megaplex: empty cinema programme");
  return {
    provider: "Megaplex",
    fetchedCinemaIds: [cinemaId],
    movies: [...movies.values()],
    showings: [...sessions.values()],
  };
};
