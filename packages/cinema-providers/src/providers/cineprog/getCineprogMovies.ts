import { isIP } from "node:net";
import { load } from "cheerio";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";

type RecordData = Record<string, unknown>;

const object = (value: unknown): RecordData => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Cineprog object");
  return value as RecordData;
};

const text = (value: unknown): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number") return;
  const result = String(value).trim();
  return result && !["*NULL*", "- keine Angabe -"].includes(result)
    ? result
    : undefined;
};

const positiveInteger = (value: unknown) => {
  const number = Number(text(value));
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

/** Only public HTTPS origins: never accept credentials, IP literals or local names. */
const publicUrl = (value: string, base?: string): URL => {
  const url = new URL(value, base);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isIP(host) ||
    host.includes(":") ||
    !host.includes(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host)
  )
    throw new Error("Cineprog requires a public HTTPS URL without credentials");
  return url;
};

/** Decode the JSON literal, not JavaScript. Braces inside strings are harmless. */
const readLiteral = (html: string, variable: "programm" | "movie") => {
  const $ = load(html);
  for (const script of $("script").toArray()) {
    const source = $(script).html() ?? "";
    const match = new RegExp(
      `(?:^|[;\\r\\n])\\s*var\\s+${variable}\\s*=\\s*`,
    ).exec(source);
    if (!match) continue;
    const start = match.index + match[0].length;
    if (source[start] !== "{")
      throw new Error(`Invalid Cineprog ${variable} literal`);
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let i = start; i < source.length; i++) {
      const char = source[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        const suffix = source.slice(i + 1).trimStart();
        if (suffix && !suffix.startsWith(";"))
          throw new Error(`Nonliteral Cineprog ${variable}`);
        return object(JSON.parse(source.slice(start, i + 1)));
      }
    }
    throw new Error(`Unterminated Cineprog ${variable}`);
  }
  throw new Error(`Unsupported Cineprog template: missing ${variable}`);
};

const screeningOffsets = (html: string) => {
  const offsets = new Map<string, Set<string>>();
  const $ = load(html);
  const visit = (value: unknown, depth = 0): void => {
    if (depth > 20) throw new Error("Cineprog JSON-LD nesting limit");
    if (Array.isArray(value)) {
      for (const child of value) visit(child, depth + 1);
    } else if (value && typeof value === "object") {
      const record = object(value);
      if (record["@type"] === "ScreeningEvent") {
        const work = object(record.workPresented);
        const id = text(work["@id"])?.split("#")[1];
        const start = text(record.startDate);
        if (id && start) {
          if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::00)?[+-]\d\d:\d\d$/.test(start))
            throw new Error("Invalid Cineprog JSON-LD startDate");
          const key = `${id}:${start.slice(0, 16)}`;
          const values = offsets.get(key) ?? new Set<string>();
          values.add(start);
          offsets.set(key, values);
        }
      }
      if (record["@graph"]) visit(record["@graph"], depth + 1);
    }
  };
  for (const script of $('script[type="application/ld+json"]').toArray())
    visit(JSON.parse($(script).html() ?? ""));
  return offsets;
};

const sessionTime = (local: string, offsets?: Set<string>) => {
  const parsed = moment.tz(local, "YYYY-MM-DDTHH:mm", true, "Europe/Berlin");
  if (!parsed.isValid() || parsed.format("YYYY-MM-DDTHH:mm") !== local)
    throw new Error(`Invalid Cineprog Berlin time: ${local}`);
  if (offsets?.size) {
    if (offsets.size !== 1)
      throw new Error(`Ambiguous Cineprog JSON-LD time: ${local}`);
    const offset = [...offsets][0]!;
    const time = moment.parseZone(offset);
    if (
      !time.isValid() ||
      time.clone().tz("Europe/Berlin").format("YYYY-MM-DDTHH:mmZ") !==
        time.format("YYYY-MM-DDTHH:mmZ")
    )
      throw new Error(`Cineprog JSON-LD/Berlin offset mismatch: ${local}`);
    return time.toDate();
  }
  if (
    [-1, 1].some(
      (hours) =>
        parsed.clone().add(hours, "hours").format("YYYY-MM-DDTHH:mm") === local,
    )
  )
    throw new Error(`Ambiguous Cineprog Berlin time without offset: ${local}`);
  return parsed.toDate();
};

const ticketLink = (value: unknown, base: string) => {
  let link = text(value);
  if (!link) return;
  if (/^https?%3a/i.test(link)) link = decodeURIComponent(link);
  return publicUrl(link.replaceAll("&amp;", "&"), base);
};

const nativeIdentity = (url?: URL) => {
  if (!url) return;
  for (const key of ["performance", "showId"]) {
    const id = url.searchParams.get(key);
    if (id) return { id, kind: key, host: url.host };
  }
};

const versionLabels: Record<string, string> = {
  OrigVersion: "OV",
  OmitU: "OmU",
  ZweiD: "2D",
  DreiD: "3D",
  VierK: "4K",
  HFR: "HFR",
  HFRDreiD: "HFR 3D",
  Dolby: "Dolby",
  DolbySiebenEins: "Dolby 7.1",
  DolbyAtmos: "Dolby Atmos",
  DBox: "D-BOX",
  VierDX: "4DX",
  imax: "IMAX",
  screenX: "ScreenX",
};

/**
 * Cineprog IDs identify published catalogue/version/event records, not canonical
 * works. Session IDs are cinema/booking-host scoped POS IDs, NOT Kinoheld API IDs.
 * Detail requests are deduplicated per idf and run at most four at a time.
 */
export const getCineprogMovies = async (
  cinemaId: number,
  baseUrl: string,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  const base = publicUrl(baseUrl).origin;
  const sourceUrl = `${base}/programm?filter=all`;
  const fetchHtml = async (url: string) => {
    const response = await request(url, { Accept: "text/html" });
    if (response.status !== 200)
      throw new Error(`Cineprog HTTP ${response.status} at ${url}`);
    if (response.body.length > 16 * 1024 * 1024)
      throw new Error("Cineprog response too large");
    return response.body;
  };
  const html = await fetchHtml(sourceUrl);
  const fetchedAt = new Date().toISOString();
  const programme = readLiteral(html, "programm");
  const films = Object.values(object(programme.filme)).map(object);
  if (!films.length || films.length > 1000)
    throw new Error("Empty or oversized Cineprog programme");
  const offsets = screeningOffsets(html);
  const details = new Map<string, RecordData>();
  const ids = [
    ...new Set(
      films.map((film) => {
        const id = text(object(film.filmfakten).idf);
        if (!id || !/^\d+$/.test(id)) throw new Error("Invalid Cineprog idf");
        return id;
      }),
    ),
  ];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (next < ids.length) {
        const id = ids[next++]!;
        const detail = readLiteral(
          await fetchHtml(`${base}/detail/${id}`),
          "movie",
        );
        const facts = object(object(detail[`film_${id}`]).filmfakten);
        if (text(facts.idf) !== id)
          throw new Error("Cineprog detail ID mismatch");
        details.set(id, facts);
      }
    }),
  );
  const catalog: ProviderCatalog = {
    provider: "Cineprog",
    movies: [],
    showings: [],
  };
  const seenMovies = new Set<string>();
  const seenSessions = new Map<string, string>();
  for (const film of films) {
    const facts = object(film.filmfakten);
    const id = text(facts.idf)!;
    const name = text(facts.titel);
    if (!name) throw new Error(`Missing Cineprog film title: ${id}`);
    const detail = details.get(id)!;
    const directors = detail.castcrew
      ? Object.values(object(object(detail.castcrew).Regie ?? {}))
          .map(text)
          .filter(Boolean)
          .join(", ")
      : undefined;
    const years = text(detail.produktionsland)?.match(
      /\b(?:18|19|20|21)\d{2}\b/g,
    );
    const year = years?.length === 1 ? Number(years[0]) : undefined;
    const evidence = {
      originalTitle: text(detail.originaltitel),
      productionYear: year && year <= 2100 ? year : undefined,
      director: directors || text(detail.director) || text(facts.director),
      runtimeMinutes:
        positiveInteger(detail.laufzeit) ?? positiveInteger(facts.laufzeit),
    };
    const screenings = object(film.vorstellungen);
    const groupFacts = object(screenings.vorstellungen_fakten ?? {});
    if (!seenMovies.has(id)) {
      seenMovies.add(id);
      catalog.movies.push({
        cinemaId,
        name,
        provider: "Cineprog",
        providerFilmId: id,
        evidence,
        sourceMetadata: {
          sourceUrl,
          fetchedAt,
          detailUrl: `${base}/detail/${id}`,
          identityScope: "catalogue-version-or-event",
          filmfakten: facts,
          detailFilmfakten: detail,
          vorstellungen_fakten: groupFacts,
        },
      });
    }
    for (const [dateKey, value] of Object.entries(object(screenings.termine))) {
      if (!/^datum_\d{4}-\d\d-\d\d$/.test(dateKey))
        throw new Error("Invalid Cineprog date key");
      const sessions = Array.isArray(value) ? value : [value];
      for (const entry of sessions) {
        const session = object(entry);
        if (!Object.keys(session).length) continue;
        const date = text(session.datum);
        const time = text(session.zeit);
        if (dateKey !== `datum_${date}` || !time || !/^\d\d:\d\d$/.test(time))
          throw new Error("Invalid Cineprog session date/time");
        const local = `${date}T${time}`;
        const crosscheck = offsets.get(`${id}:${local}`);
        const dateTime = sessionTime(local, crosscheck);
        // Park's fixticket can repeat the day's FIRST session. Desktop is the
        // authoritative per-row link; never borrow IDs from another candidate.
        const desktop = ticketLink(session.link_desktop, base);
        const mobile = ticketLink(session.link_mobile, base);
        const fixed = ticketLink(session.link_fixticket, base);
        const native = desktop ?? mobile ?? fixed;
        const external = ticketLink(session.external_ticket_url, base);
        const identity = nativeIdentity(native);
        const room = text(session.saal);
        const composite = `${id}:${local}:${room ?? text(session.saal_bezeichnung) ?? "unknown-room"}`;
        const providerSessionId = identity
          ? `${cinemaId}:${identity.host}:${identity.kind}:${identity.id}`
          : `${cinemaId}:composite:${composite}`;
        const previous = seenSessions.get(providerSessionId);
        if (previous && previous !== composite)
          throw new Error("Conflicting Cineprog session ID");
        if (previous) continue;
        seenSessions.set(providerSessionId, composite);
        const labels = { ...facts, ...groupFacts, ...session };
        const additional = [
          text(session.saal_bezeichnung) ?? (room ? `Saal ${room}` : undefined),
          text(facts.Versionsmarker),
          ...Object.entries(versionLabels)
            .filter(([key]) => {
              const flag = labels[key];
              return (
                flag === true || flag === 1 || flag === "1" || flag === "true"
              );
            })
            .map(([, label]) => label),
        ].filter((label): label is string => Boolean(label));
        catalog.showings.push({
          cinemaId,
          movieName: name,
          provider: "Cineprog",
          providerFilmId: id,
          providerSessionId,
          evidence,
          dateTime,
          bookingUrl: (external ?? native)?.href,
          showingAdditionalData: [...new Set(additional)],
          sourceMetadata: {
            sourceUrl,
            fetchedAt,
            session,
            vorstellungen_fakten: groupFacts,
            nativeSessionId: identity?.id,
            nativeSessionIdKind: identity?.kind,
            sessionIdentity: identity
              ? "native-ticket-link"
              : "film-time-room-composite",
            selectedNativeLink: native?.href,
            linkConflict:
              new Set(
                [desktop, mobile, fixed].filter(Boolean).map((url) => {
                  const candidate = nativeIdentity(url);
                  return candidate
                    ? `${candidate.kind}:${candidate.id}`
                    : url?.href;
                }),
              ).size > 1,
            timezone: "Europe/Berlin",
            jsonLdStartDates: crosscheck ? [...crosscheck] : [],
            timeCrosscheck: crosscheck ? "matched" : "unavailable",
            audioLanguage: null,
            subtitleLanguage: null,
            availability: null,
            cancellationStatus: null,
            accessibilityScope: "film-or-group-not-session-confirmed",
          },
        });
      }
    }
  }
  if (!catalog.showings.length) throw new Error("Empty Cineprog screenings");
  catalog.fetchedCinemaIds = [cinemaId];
  return catalog;
};
