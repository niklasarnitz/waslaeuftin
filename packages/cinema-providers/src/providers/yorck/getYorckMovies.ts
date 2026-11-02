import { load } from "cheerio";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://www.yorck.de";
const SESSIONS =
  "https://uq8lgoj7z2.execute-api.eu-central-1.amazonaws.com/production/api/vista/OData.svc/Sessions";
const ZONE = "Europe/Berlin";
const LOCAL_FORMAT = "YYYY-MM-DDTHH:mm:ss";
type RecordValue = Record<string, unknown>;
type Request = typeof fetchTextWithBun;

const fail = (message: string): never => {
  throw new Error(`Yorck: ${message}`);
};
const record = (value: unknown): RecordValue => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail("malformed object");
  return value as RecordValue;
};
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const requiredText = (value: unknown): string =>
  text(value) ?? fail("missing text field");
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : fail("missing array");
const fields = (value: unknown) => record(record(value).fields);
const id = (value: unknown) => requiredText(record(record(value).sys).id);
const strings = (value: unknown): string[] =>
  value === undefined ? [] : array(value).map(requiredText);
const positiveInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;

const filmId = (entry: unknown): string | undefined => {
  const entryId = id(entry);
  const vistaId = text(fields(entry).vistaId);
  if (vistaId && vistaId !== entryId) fail("conflicting CMS film IDs");
  return /^HO\d+$/.test(entryId) ? entryId : undefined;
};

const pageProps = (html: string): RecordValue | undefined => {
  const script = load(html)("script#__NEXT_DATA__").text();
  if (!script) return fail("missing Next.js programme data");
  const data: unknown = JSON.parse(script);
  if (record(data).isFallback === true) return undefined;
  return record(record(record(data).props).pageProps);
};

const pick = (source: RecordValue, keys: string[]): RecordValue =>
  Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );

// Offset-less API dates are Berlin wall times, never machine-local dates.
// CMS offsets resolve the repeated autumn hour; without one it is unsafe to guess.
const sessionTime = (apiTime: unknown, ssrTime: unknown): Date => {
  const local = requiredText(apiTime);
  const parsed = moment.tz(local, LOCAL_FORMAT, true, ZONE);
  if (!parsed.isValid() || parsed.format(LOCAL_FORMAT) !== local)
    return fail(`invalid Berlin showtime ${local}`);
  if (ssrTime !== undefined) {
    const zoned = requiredText(ssrTime);
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
        zoned,
      )
    )
      return fail("CMS showtime requires an explicit offset");
    const explicit = moment.parseZone(zoned, moment.ISO_8601, true);
    if (
      !explicit.isValid() ||
      explicit.clone().tz(ZONE).format(LOCAL_FORMAT) !== local
    )
      return fail("API/CMS showtime disagreement");
    return explicit.toDate();
  }
  for (const hours of [-2, -1, 1, 2]) {
    if (parsed.clone().add(hours, "hours").format(LOCAL_FORMAT) === local)
      return fail("ambiguous Berlin showtime without CMS offset");
  }
  return parsed.toDate();
};

/** Public read-only Sessions proxy + identity-validated Yorck SSR metadata. */
export const getYorckMovies = async (
  cinemaId: number,
  config: { vistaId: string; slug: string },
  request: Request = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  if (!/^\d+$/.test(config.vistaId) || !/^[a-z0-9-]+$/.test(config.slug))
    fail("invalid cinema configuration");
  const fetchedAt = new Date().toISOString();
  const venueUrl = `${ORIGIN}/kinos/${config.slug}`;
  const apiUrl = new URL(SESSIONS);
  apiUrl.searchParams.set(
    "$filter",
    `CinemaId eq '${config.vistaId}' and Showtime gt DATETIME'${fetchedAt}'`,
  );
  const get = async (url: string, json = false) => {
    const response = await request(url, {
      Accept: json ? "application/json" : "text/html",
      ...(json ? { "Content-Type": "application/json", Origin: ORIGIN } : {}),
    });
    if (response.status !== 200)
      throw new Error(describeFailedResponse(response));
    return response.body;
  };
  const getPage = async (url: string) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const props = pageProps(await get(url));
      if (props) return props;
      // Next.js may serve an explicit ISR fallback shell on a cold detail URL.
      if (attempt < 4)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** attempt),
        );
    }
    return fail(`unresolved Next.js fallback at ${url}`);
  };
  const [props, apiBody] = await Promise.all([
    getPage(venueUrl),
    get(apiUrl.href, true),
  ]);
  if (
    id(props.cinema) !== config.vistaId ||
    requiredText(fields(props.cinema).vistaId) !== config.vistaId ||
    requiredText(fields(props.cinema).slug) !== config.slug
  )
    fail("CMS cinema does not match configuration");
  const api = record(JSON.parse(apiBody));
  if (api["odata.nextLink"] || api["@odata.nextLink"])
    fail("unexpected Sessions pagination; refusing an incomplete catalog");
  const sessions = new Map<string, RecordValue>();
  for (const value of array(api.value)) {
    const session = record(value);
    if (requiredText(session.CinemaId) !== config.vistaId) continue;
    const sessionId = requiredText(session.ID);
    if (
      sessionId !== `${config.vistaId}-${requiredText(session.SessionId)}` ||
      !new RegExp(`^${config.vistaId}-\\d+$`).test(sessionId)
    )
      fail("session ID is not scoped to the configured cinema");
    const previous = sessions.get(sessionId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(session))
      fail(`conflicting API session ${sessionId}`);
    sessions.set(sessionId, session);
  }
  if (!sessions.size) fail("empty native programme");

  const films = new Map<string, RecordValue>();
  const specialSlugs = new Map<string, string>();
  const cmsSessions = new Map<
    string,
    { filmId?: string; startTime: string; formats: string[] }
  >();
  for (const entry of array(props.filmsSpecials)) {
    const entryFields = fields(entry);
    const providerFilmId = filmId(entry);
    if (providerFilmId) {
      const previous = films.get(providerFilmId);
      if (previous && previous.slug !== entryFields.slug)
        fail(`conflicting film slug ${providerFilmId}`);
      films.set(providerFilmId, entryFields);
    }
    // Special/series titles and assignedFilms.title are not movie identities.
    for (const session of array(entryFields.sessions)) {
      const sessionId = id(session);
      if (!sessionId.startsWith(`${config.vistaId}-`)) continue;
      if (!providerFilmId)
        specialSlugs.set(sessionId, requiredText(entryFields.slug));
      const sessionFields = fields(session);
      const startTime = requiredText(sessionFields.startTime);
      const formats = strings(sessionFields.formats);
      const previous = cmsSessions.get(sessionId);
      if (
        previous &&
        (previous.startTime !== startTime ||
          (previous.filmId &&
            providerFilmId &&
            previous.filmId !== providerFilmId))
      )
        fail(`conflicting CMS session ${sessionId}`);
      cmsSessions.set(sessionId, {
        filmId: previous?.filmId ?? providerFilmId,
        startTime,
        formats: [...new Set([...(previous?.formats ?? []), ...formats])],
      });
    }
  }

  const details = new Map<string, RecordValue>();
  const getFilm = async (slug: string, expectedId: string) => {
    if (!/^[a-z0-9-]+$/.test(slug)) return fail("invalid film slug");
    const cached = details.get(expectedId);
    if (cached) {
      if (cached.slug !== slug) fail("conflicting film detail slugs");
      return cached;
    }
    const detail = (await getPage(`${ORIGIN}/filme/${slug}`)).film;
    if (filmId(detail) !== expectedId) fail("film detail identity conflict");
    const movie = fields(detail);
    if (requiredText(movie.slug) !== slug) fail("film detail slug conflict");
    details.set(expectedId, movie);
    return movie;
  };
  const specials = new Map<string, RecordValue>();
  const wantedFilms = new Set<string>();
  for (const [sessionId, session] of sessions) {
    const providerFilmId = requiredText(session.ScheduledFilmId);
    if (!films.has(providerFilmId)) {
      // Venue SSR omits some future films in series. Recover the slug through
      // the exact special session, then validate the detail's ID against Vista.
      const specialSlug = specialSlugs.get(sessionId);
      if (!specialSlug || !/^[a-z0-9-]+$/.test(specialSlug))
        fail(`unknown native film ${providerFilmId} for ${sessionId}`);
      let special = specials.get(specialSlug!);
      if (!special) {
        special = await getPage(`${ORIGIN}/specials/${specialSlug}`);
        specials.set(specialSlug!, special);
      }
      const matched = array(special.sessions).find(
        (entry) => id(entry) === sessionId,
      );
      if (!matched) fail(`special has no native session ${sessionId}`);
      const specialSession = fields(matched);
      sessionTime(session.Showtime, specialSession.startTime);
      const slug = requiredText(fields(specialSession.film).slug);
      films.set(providerFilmId, await getFilm(slug, providerFilmId));
    }
    const cms = cmsSessions.get(sessionId);
    if (cms?.filmId && cms.filmId !== providerFilmId)
      fail(`API/CMS film identity conflict for ${sessionId}`);
    wantedFilms.add(providerFilmId);
  }

  const movies: ProviderCatalog["movies"] = [];
  // Sequential detail reads avoid bursting the public website; one per native ID.
  for (const providerFilmId of wantedFilms) {
    const listing = films.get(providerFilmId)!;
    const slug = requiredText(listing.slug);
    const sourceUrl = `${ORIGIN}/filme/${slug}`;
    const movie = await getFilm(slug, providerFilmId);
    const year = positiveInteger(movie.year);
    movies.push({
      cinemaId,
      name: requiredText(movie.title),
      provider: "Yorck",
      providerFilmId,
      evidence: {
        tmdbId: positiveInteger(movie.tmdbId),
        originalTitle: text(movie.originalTitle),
        director: text(movie.director),
        productionYear: year && year >= 1800 && year <= 2100 ? year : undefined,
        runtimeMinutes:
          positiveInteger(movie.runtime) ?? positiveInteger(listing.runtime),
      },
      sourceMetadata: {
        ...pick(movie, [
          "tmdbId",
          "title",
          "slug",
          "originalTitle",
          "originalLanguage",
          "year",
          "director",
          "runtime",
          "writer",
          "cast",
          "countries",
          "fsk",
          "releaseDate",
          "distributor",
          "about",
          "poster",
          "filmStills",
          "tagline",
          "mainLabel",
          "trailer1YouTubeId",
          "airtableUpdated",
        ]),
        sourceUrl,
        venueSourceUrl: venueUrl,
        fetchedAt,
      },
    });
  }
  const byId = new Map(movies.map((movie) => [movie.providerFilmId, movie]));
  const showings: ProviderCatalog["showings"] = [];
  for (const [sessionId, session] of sessions) {
    const providerFilmId = requiredText(session.ScheduledFilmId);
    const movie = byId.get(providerFilmId)!;
    const cms = cmsSessions.get(sessionId);
    const formats = [
      ...new Set([
        ...strings(session.SessionAttributesNames),
        ...strings(session.ConceptAttributesNames),
        ...(cms?.formats ?? []),
      ]),
    ];
    showings.push({
      cinemaId,
      provider: "Yorck",
      providerFilmId,
      providerSessionId: sessionId,
      movieName: movie.name,
      evidence: movie.evidence,
      dateTime: sessionTime(session.Showtime, cms?.startTime),
      bookingUrl: `${ORIGIN}/en/checkout/seats?sessionid=${encodeURIComponent(sessionId)}`,
      showingAdditionalData: [
        ...new Set([
          ...(text(session.ScreenName)
            ? [requiredText(session.ScreenName)]
            : []),
          ...formats,
        ]),
      ],
      sourceMetadata: {
        ...pick(session, [
          "ID",
          "CinemaId",
          "ScheduledFilmId",
          "SessionId",
          "Showtime",
          "ScreenName",
          "ScreenNumber",
          "SessionAttributesNames",
          "ConceptAttributesNames",
          "FormatCode",
          "IsAllocatedSeating",
          "SeatsAvailable",
          "AllowTicketSales",
          "SoldoutStatus",
          "SalesChannels",
          "TypeCode",
        ]),
        formats,
        cmsStartTime: cms?.startTime,
        sourceUrl: apiUrl.href,
        venueSourceUrl: venueUrl,
        fetchedAt,
      },
    });
  }
  return { provider: "Yorck", fetchedCinemaIds: [cinemaId], movies, showings };
};
