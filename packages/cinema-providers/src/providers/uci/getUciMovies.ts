import { load } from "cheerio";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://www.uci-kinowelt.de";
const TIMEZONE = "Europe/Berlin";
const WALL_FORMAT = "YYYYMMDD HH:mm";

export interface UciCinemaConfig {
  slug: string;
  siteId: string;
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const validConfig = ({ slug, siteId }: UciCinemaConfig) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && /^[1-9]\d*$/.test(siteId);

const readHtml = async (url: string, request: typeof fetchTextWithBun) => {
  const response = await request(url, { Accept: "text/html" });
  if (response.status !== 200)
    throw new Error(`UCI: ${describeFailedResponse(response)}`);
  return load(response.body);
};

const readDirectory = ($: ReturnType<typeof load>): UciCinemaConfig[] => {
  const value: unknown = JSON.parse($("script#cinema-list").text() || "null");
  if (!Array.isArray(value) || !value.length)
    throw new Error("UCI: missing cinema directory");
  return value.map((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("slug" in entry) ||
      !("site_id" in entry) ||
      typeof entry.slug !== "string" ||
      (typeof entry.site_id !== "number" && typeof entry.site_id !== "string")
    )
      throw new Error("UCI: invalid cinema directory entry");
    const config = { slug: entry.slug, siteId: String(entry.site_id) };
    if (!validConfig(config))
      throw new Error("UCI: invalid cinema directory IDs");
    return config;
  });
};

// A native wall clock has no offset. Reject DST gaps AND repeated hours rather
// than silently moving a showing or arbitrarily choosing one of two instants.
const berlinDate = (date: string, time: string) => {
  const wall = `${date} ${time}`;
  const parsed = moment.utc(wall, WALL_FORMAT, true);
  if (!parsed.isValid() || parsed.format(WALL_FORMAT) !== wall)
    throw new Error(`UCI: invalid session date/time ${wall}`);
  const zone = moment.tz.zone(TIMEZONE)!;
  const offsets = new Set(
    [-86_400_000, 0, 86_400_000].map((delta) =>
      zone.utcOffset(parsed.valueOf() + delta),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => parsed.valueOf() + offset * 60_000)
    .filter(
      (instant) => moment.tz(instant, TIMEZONE).format(WALL_FORMAT) === wall,
    );
  if (candidates.length !== 1)
    throw new Error(
      `UCI: ambiguous or nonexistent Berlin session time ${wall}`,
    );
  return new Date(candidates[0]!);
};

export const getUciCinemas = async (
  request: typeof fetchTextWithBun = fetchTextWithBun,
) => readDirectory(await readHtml(`${ORIGIN}/`, request));

/** Public programme HTML contains metadata and all dated sessions in one GET.
 * Native CMS container IDs differ from public film IDs; never interchange them.
 * No booking links are followed, and no availability/language is inferred.
 */
export const getUciMovies = async (
  cinemaId: number,
  config: UciCinemaConfig,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  if (!Number.isSafeInteger(cinemaId) || cinemaId <= 0 || !validConfig(config))
    throw new Error("UCI: invalid cinema configuration");
  const sourceUrl = `${ORIGIN}/kinoprogramm/${config.slug}`;
  const $ = await readHtml(sourceUrl, request);
  const fetchedAt = new Date().toISOString();
  if (
    !readDirectory($).some(
      (entry) => entry.slug === config.slug && entry.siteId === config.siteId,
    )
  )
    throw new Error("UCI: cinema slug/site ID mismatch");

  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const sessions = new Map<string, ProviderCatalog["showings"][number]>();
  let parsedElements = 0;
  for (const element of $(".film-container").toArray()) {
    const film = $(element);
    const performances = film.find(".film-schedule a.badge-performance");
    if (!performances.length) continue; // Preview-only films are not schedules.
    const heading = film.find("h2 a[href]").first();
    const name = clean(heading.text());
    const filmUrl = new URL(heading.attr("href") || "", ORIGIN);
    const path = /^\/film\/[^/]+\/(\d+)\/([^/]+)\/(\d+)\/?$/.exec(
      filmUrl.pathname,
    );
    const filmId = path?.[1];
    if (
      !name ||
      filmUrl.origin !== ORIGIN ||
      !filmId ||
      path?.[2] !== config.slug ||
      path[3] !== config.siteId
    )
      throw new Error("UCI: invalid film identity or cinema scope");

    const descriptions: Record<string, string> = {};
    for (const row of film.find(".film-description__row").toArray()) {
      const label = clean($(row).find("dt").text());
      const value = clean($(row).find("dd").text());
      if (label && value) descriptions[label] = value;
    }
    const filmInfo = film
      .find(".film-info li")
      .toArray()
      .map((item) => clean($(item).text()))
      .filter(Boolean);
    const runtime = filmInfo
      .map((label) => /^(\d+)\s*min$/i.exec(label)?.[1])
      .find(Boolean);
    const productionYear = descriptions.Produktionsjahr;
    if (
      (runtime !== undefined && Number(runtime) <= 0) ||
      (productionYear !== undefined &&
        (!/^\d{4}$/.test(productionYear) ||
          Number(productionYear) < 1800 ||
          Number(productionYear) > 2100))
    )
      throw new Error("UCI: invalid film identity evidence");
    const evidence = {
      director: descriptions.Regie || undefined,
      runtimeMinutes: runtime ? Number(runtime) : undefined,
      originalTitle: descriptions.Originaltitel || undefined,
      productionYear: productionYear ? Number(productionYear) : undefined,
    };
    const movie = {
      cinemaId,
      provider: "UCI",
      providerFilmId: filmId,
      name,
      evidence,
      sourceMetadata: {
        sourceUrl,
        fetchedAt,
        filmUrl: filmUrl.href,
        siteId: config.siteId,
        containerId: film.closest("[data-film-container]").attr("data-film-id"),
        descriptions,
        filmInfo,
        ageRating: film.find(".age-rating-info__icon img").attr("alt"),
      },
    };
    const existingMovie = movies.get(filmId);
    if (existingMovie && existingMovie.name !== name)
      throw new Error(`UCI: conflicting film title for ${filmId}`);
    movies.set(filmId, movie);

    const legend = new Map<string, { label: string; description?: string }>();
    for (const badge of film.find(".legend [data-attribute-id]").toArray()) {
      const node = $(badge);
      const code = node.attr("data-attribute-id")!;
      const label = clean(node.text()).replace(/:$/, "");
      const description = clean(
        node.attr("data-bs-title") ||
          node.next(".legend__right-description").text(),
      );
      if (label)
        legend.set(code, { label, description: description || undefined });
    }
    for (const performance of performances.toArray()) {
      parsedElements++;
      const node = $(performance);
      const bookingUrl = new URL(node.attr("href") || "", ORIGIN);
      const perfId = bookingUrl.searchParams.get("perf_id");
      const siteId = bookingUrl.searchParams.get("site_id");
      if (
        bookingUrl.origin !== "https://buchung.uci-kinowelt.de" ||
        bookingUrl.pathname !== "/" ||
        siteId !== config.siteId ||
        !perfId ||
        !/^[a-z0-9]+$/i.test(perfId) ||
        node.attr("data-tracking-film-id") !== filmId
      )
        throw new Error("UCI: invalid session identity or cinema scope");
      const date = node.attr("data-date") || "";
      const time = node.attr("data-time") || "";
      const dateTime = berlinDate(date, time);
      const room = clean(node.attr("data-tracking-auditorium") || "");
      const rawVersion = node.attr("data-version") || "";
      const versions = [...new Set(rawVersion.split("|").filter(Boolean))];
      const versionLabels = versions.map((code) => ({
        code,
        ...legend.get(code),
      }));
      const visibleLabels = node
        .find(".performance-badge__subtext")
        .toArray()
        .map((label) => clean($(label).text()))
        .filter(Boolean);
      const showing = {
        cinemaId,
        provider: "UCI",
        providerFilmId: filmId,
        // Performance IDs are scoped by native site, not our internal cinema ID.
        providerSessionId: `${siteId}:${perfId}`,
        movieName: name,
        evidence,
        dateTime,
        bookingUrl: bookingUrl.href,
        showingAdditionalData: [
          ...new Set(
            [
              room,
              ...versionLabels.flatMap((v) => (v.label ? [v.label] : [])),
              ...visibleLabels,
            ].filter(Boolean),
          ),
        ],
        sourceMetadata: {
          sourceUrl,
          fetchedAt,
          filmUrl: filmUrl.href,
          siteId,
          perfId,
          date,
          time,
          timezone: TIMEZONE,
          room: room || undefined,
          rawVersion,
          versions,
          versionLabels,
          visibleLabels,
          special: node.attr("data-special"),
          classes: node.attr("class"),
        },
      };
      const existing = sessions.get(showing.providerSessionId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(showing))
        throw new Error(`UCI: conflicting duplicate performance ${perfId}`);
      sessions.set(showing.providerSessionId, showing);
    }
  }
  // Orphan dated badges indicate changed markup, not a successful empty fetch.
  if (
    !sessions.size ||
    $("a.badge-performance[data-date]").length !== parsedElements
  )
    throw new Error("UCI: empty or malformed programme");
  return {
    provider: "UCI",
    fetchedCinemaIds: [cinemaId],
    movies: [...movies.values()],
    showings: [...sessions.values()],
  };
};
