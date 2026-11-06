import { load } from "cheerio";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://www.starmovie.at";
const SLUGS = [
  "regau",
  "liezen",
  "peuerbach",
  "ried",
  "steyr",
  "wels",
  "tulln",
];
const fail = (message: string): never => {
  throw new Error(`StarMovie: ${message}`);
};
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const required = (value: string | undefined): string =>
  (value && clean(value)) || fail("missing required text");

/** Read-only, location-validated programme HTML; at most 80 film-detail GETs. */
export const getStarMovieMovies = async (
  cinemaId: number,
  slug: string,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  if (!SLUGS.includes(slug) || !Number.isSafeInteger(cinemaId) || cinemaId <= 0)
    fail("invalid cinema configuration");
  const basePath = `/star-movie-${slug}/`;
  const sourceUrl = `${ORIGIN}${basePath}programm/`;
  const fetchedAt = new Date().toISOString();
  const now = Date.now();
  const get = async (url: string, canonicalUrl = url) => {
    const response = await request(url, { Accept: "text/html" });
    if (response.status !== 200)
      throw new Error(describeFailedResponse(response));
    const $ = load(response.body);
    // Navigation contains all seven locations; only currentLocation identifies
    // the response itself. Never infer identity from an arbitrary venue link.
    const scripts = $("script")
      .toArray()
      .map((node) => $(node).text())
      .join("\n");
    const locations = [
      ...scripts.matchAll(/App\.currentLocation\s*=\s*"([a-z]+)"\s*;/g),
    ];
    if (
      locations.length !== 1 ||
      locations[0]?.[1] !== slug ||
      $("link[rel='canonical']").attr("href") !== canonicalUrl
    )
      fail(`page/location identity mismatch at ${url}`);
    return $;
  };
  const $ = await get(sourceUrl);
  const cards = $(".movie-card").toArray();
  if (!cards.length) fail("missing programme cards");
  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const sessions = new Map<string, ProviderCatalog["showings"][number]>();
  let detailCount = 0;

  for (const node of cards) {
    const card = $(node);
    const anchors = card.find("a.movie-card__time").toArray();
    // The same listing also advertises advance releases with no performances.
    if (!anchors.length) continue;
    const link = card.find("a.movie-card__wrapper-link");
    if (link.length !== 1) fail("missing or ambiguous film link");
    const name = required(link.attr("title")); // h3 is frequently truncated.
    // An actual closure notice is represented as a bookable pseudo-film.
    if (/^Ruhetag:\s*Heute keine Vorstellungen!$/i.test(name)) continue;
    const ids = [
      ...new Set(
        card
          .find("[data-movie-id]")
          .toArray()
          .map((entry) => required($(entry).attr("data-movie-id"))),
      ),
    ];
    const nativeFilmId = ids[0];
    if (ids.length !== 1 || !nativeFilmId || !/^[1-9]\d*$/.test(nativeFilmId))
      fail("missing or conflicting native film ID");
    const providerFilmId = `${slug}:${nativeFilmId}`;
    const detailUrl = new URL(required(link.attr("href")), ORIGIN);
    if (
      detailUrl.origin !== ORIGIN ||
      !detailUrl.pathname.startsWith(`${basePath}programm/filme/`) ||
      !/\/[^/]+-\d+\/$/.test(detailUrl.pathname) ||
      detailUrl.search ||
      detailUrl.hash
    )
      fail("invalid film detail URL");

    const pending: ProviderCatalog["showings"] = [];
    for (const entry of anchors) {
      const anchor = $(entry);
      const timestamp = required(anchor.attr("data-program-time"));
      if (!/^[1-9]\d{9}$/.test(timestamp)) fail("invalid Unix-second showtime");
      const dateTime = new Date(Number(timestamp) * 1000);
      const date = required(
        anchor.closest(".showings__content").attr("data-date"),
      );
      const label = clean(
        anchor.clone().find(".program-time__icons").remove().end().text(),
      );
      const parts =
        /^(\d{2}:\d{2})\s+(.+)$/.exec(label) ?? fail("invalid showtime label");
      const local = moment(dateTime).tz("Europe/Vienna");
      if (
        local.format("YYYY-MM-DD") !== date ||
        local.format("HH:mm") !== parts[1]
      )
        fail("showtime disagrees with displayed Vienna date/time");
      const bookingUrl = new URL(required(anchor.attr("href")), ORIGIN);
      const programIds = bookingUrl.searchParams.getAll("programId");
      const programId = programIds[0];
      if (
        bookingUrl.origin !== ORIGIN ||
        bookingUrl.pathname !==
          `${basePath}memberbereich/online-reservierung/` ||
        programIds.length !== 1 ||
        !programId ||
        !/^[1-9]\d*$/.test(programId) ||
        bookingUrl.hash
      )
        fail("invalid or wrong-location booking link");
      // First-party ProgramDates marks elapsed sessions is-expired; purchase-only
      // is the last hour before a show and must NOT be treated as cancellation.
      // Do not use generic .hidden: the site's date filter hides valid dates.
      if (anchor.hasClass("is-expired") || dateTime.getTime() <= now) continue;
      if (anchor.is("[disabled], [aria-disabled='true']")) continue;
      const showingAdditionalData = required(parts[2])
        .split("/")
        .map(clean)
        .filter(Boolean);
      pending.push({
        cinemaId,
        provider: "StarMovie",
        providerFilmId,
        providerSessionId: `${slug}:${programId}`,
        movieName: name,
        dateTime,
        bookingUrl: bookingUrl.href,
        showingAdditionalData,
        sourceMetadata: {
          sourceUrl,
          fetchedAt,
          slug,
          nativeFilmId,
          programId,
          programTime: timestamp,
          date,
          label,
          classes: anchor.attr("class"),
          title: anchor.attr("title"),
        },
      });
    }
    if (!pending.length) continue;

    let movie = movies.get(providerFilmId);
    if (movie) {
      if (
        movie.name !== name ||
        movie.sourceMetadata?.detailUrl !== detailUrl.href
      )
        fail(`conflicting film ${providerFilmId}`);
    } else {
      if (++detailCount > 80) fail("unexpected film-detail request count");
      // Location-specific details intentionally canonicalize to /filme/.
      const canonicalUrl = `${ORIGIN}/filme/${detailUrl.pathname.split("/").at(-2)}/`;
      const detail = await get(detailUrl.href, canonicalUrl);
      const detailIds = [
        ...new Set(
          detail(".header-slider [data-movie-id]")
            .toArray()
            .map((entry) => detail(entry).attr("data-movie-id")),
        ),
      ];
      if (
        detailIds.length !== 1 ||
        detailIds[0] !== nativeFilmId ||
        clean(detail("h1").text()) !== name
      )
        fail(`film-detail identity conflict for ${providerFilmId}`);
      const facts: Record<string, string> = {};
      for (const row of detail(".movies-info__table tr").toArray()) {
        const key = clean(
          detail(row).find(".movies-info__table-title").text(),
        ).replace(/:\s*$/, "");
        const value = clean(
          detail(row).find(".movies-info__table-description").text(),
        );
        if (facts[key] !== undefined && facts[key] !== value)
          fail("conflicting film facts");
        facts[key] = value;
      }
      // Only explicitly labelled film facts are evidence. Filmstart and years
      // in event titles/copy are not production years; event durations are not
      // reconstructed from a marathon's constituent films.
      const runtime = /^(\d+) Min\.$/.exec(facts.Dauer ?? "");
      const year = /(?:^|\s)((?:18|19|20)\d{2})$/.exec(facts.Land ?? "");
      const meaningful = (value: string | undefined) =>
        value && !/^(?:noch nicht bekannt|unbekannt|-)$/i.test(value)
          ? value
          : undefined;
      movie = {
        cinemaId,
        name,
        provider: "StarMovie",
        providerFilmId,
        evidence: {
          originalTitle: meaningful(facts.Originaltitel),
          director: meaningful(facts.Regie),
          ...(runtime && Number(runtime[1]) > 0
            ? { runtimeMinutes: Number(runtime[1]) }
            : {}),
          ...(year ? { productionYear: Number(year[1]) } : {}),
        },
        sourceMetadata: {
          sourceUrl,
          detailUrl: detailUrl.href,
          fetchedAt,
          slug,
          nativeFilmId,
          facts,
          cardFacts: clean(card.find(".movie-card__facts").text()),
          tags: card.attr("data-tags"),
          startDate: card.attr("data-start-date"),
        },
      };
      movies.set(providerFilmId, movie);
    }
    for (const showing of pending) {
      showing.evidence = movie.evidence;
      const sessionId = showing.providerSessionId!;
      const previous = sessions.get(sessionId);
      if (previous && JSON.stringify(previous) !== JSON.stringify(showing))
        fail(`conflicting session ${sessionId}`);
      sessions.set(sessionId, showing);
    }
  }
  if (!sessions.size) fail("empty or unsupported native programme");
  return {
    provider: "StarMovie",
    fetchedCinemaIds: [cinemaId],
    movies: [...movies.values()],
    showings: [...sessions.values()],
  };
};
