import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";

const ORIGIN = "https://booking.cinetixx.de";
const TIME_ZONE = "Europe/Berlin";
const DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss";
type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Cinetixx: expected an object");
  return value as JsonRecord;
};

const nativeId = (value: unknown): string => {
  if (
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && /^[1-9]\d*$/.test(value))
  )
    return String(value);
  throw new Error("Cinetixx: missing or invalid native ID");
};

const label = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

// Enumerate real zone offsets and round-trip each candidate. Moment's default
// parsing silently shifts nonexistent times and chooses one side of a DST fold.
const berlinDate = (value: unknown): Date => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value)
  )
    throw new Error("Cinetixx: invalid local date/time");
  const local = moment.utc(value, DATE_FORMAT, true);
  if (!local.isValid()) throw new Error("Cinetixx: invalid local date/time");
  const zone = moment.tz.zone(TIME_ZONE)!;
  const candidates = [...new Set(zone.offsets)]
    .map((offset) => local.valueOf() + offset * 60_000)
    .filter(
      (instant) => moment.tz(instant, TIME_ZONE).format(DATE_FORMAT) === value,
    );
  if (candidates.length !== 1)
    throw new Error("Cinetixx: nonexistent or ambiguous local date/time");
  return new Date(candidates[0]!);
};

const bookingLink = (
  value: unknown,
  cinemaId: string,
  showId: string,
): string | undefined => {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string")
    throw new Error("Cinetixx: invalid booking URL");
  const url = new URL(value);
  if (
    url.origin !== ORIGIN ||
    url.username ||
    url.password ||
    url.pathname !== "/frontend/index.html" ||
    url.searchParams.get("cinemaId") !== cinemaId ||
    url.searchParams.get("showId") !== showId
  )
    throw new Error("Cinetixx: booking URL does not match native cinema/show");
  return value;
};

/** Anonymous programme only: no seat, cart, order or authenticated endpoints. */
export const getCinetixxMovies = async (
  cinemaId: number,
  providerCinemaId: string,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  nativeId(providerCinemaId);
  const response = await request(
    `${ORIGIN}/api/cinemas/events/cinema/${providerCinemaId}`,
    { Accept: "application/json" },
  );
  const fetchedAt = new Date().toISOString();
  if (response.status !== 200)
    throw new Error(`Cinetixx: ${describeFailedResponse(response)}`);
  const events: unknown = JSON.parse(response.body);
  if (!Array.isArray(events) || events.length === 0)
    throw new Error("Cinetixx: empty or malformed programme");

  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const showings: ProviderCatalog["showings"] = [];
  const sessions = new Map<string, string>();
  for (const value of events) {
    const event = record(value);
    const eventId = nativeId(event.id);
    if (!Array.isArray(event.shows))
      throw new Error(`Cinetixx: missing shows for event ${eventId}`);
    const name = label(event.movieName) || label(event.title);
    if (!name) throw new Error(`Cinetixx: missing title for event ${eventId}`);
    // Custom events can have no movie identity. Never put event IDs in the
    // movie namespace or derive identity from xrefReleaseNo (unknown namespace).
    const movieId =
      event.movieId == null || event.movieId === 0 || event.movieId === "0"
        ? undefined
        : nativeId(event.movieId);
    const providerFilmId = movieId ? `movie:${movieId}` : `event:${eventId}`;
    const evidence = {
      ...(label(event.director) ? { director: label(event.director) } : {}),
      ...(typeof event.duration === "number" &&
      Number.isInteger(event.duration) &&
      event.duration > 0
        ? { runtimeMinutes: event.duration }
        : {}),
    };
    // Keep raw film fields, including premiereDate and xrefReleaseNo, as source
    // evidence only; neither establishes an original title/year/external ID.
    const film = Object.fromEntries(
      Object.entries(event).filter(
        ([key]) => !["shows", "cinema", "auditoriums"].includes(key),
      ),
    );
    let hasScopedShow = false;
    for (const rawShow of event.shows) {
      const show = record(rawShow);
      if (nativeId(show.cinemaId) !== providerCinemaId) continue;
      hasScopedShow = true;
      const showId = nativeId(show.id);
      if (nativeId(show.eventId) !== eventId)
        throw new Error(`Cinetixx: event mismatch for show ${showId}`);
      const dateTime = berlinDate(show.displayDateTime);
      const bookingUrl = bookingLink(
        show._UrlBooking,
        providerCinemaId,
        showId,
      );
      if (show.auditoriumId != null) nativeId(show.auditoriumId);
      for (const key of [
        "booking",
        "canSale",
        "canReservation",
        "flagNotForSale",
      ])
        if (show[key] != null && typeof show[key] !== "boolean")
          throw new Error(`Cinetixx: invalid ${key} for show ${showId}`);
      const signature = JSON.stringify([providerFilmId, show]);
      if (sessions.has(showId)) {
        if (sessions.get(showId) !== signature)
          throw new Error(`Cinetixx: conflicting duplicate show ${showId}`);
        continue;
      }
      sessions.set(showId, signature);
      showings.push({
        cinemaId,
        movieName: name,
        provider: "Cinetixx",
        providerFilmId,
        providerSessionId: showId,
        evidence,
        dateTime,
        bookingUrl,
        showingAdditionalData: [
          ...new Set(
            [
              label(show.auditoriumName),
              label(event.versionType),
              label(event.language),
              label(show.language),
              event.is3D === true || show.is3D === true ? "3D" : "",
              // TBA is a placeholder, not evidence of an audio format.
              label(event.audioType) === "TBA" ? "" : label(event.audioType),
            ].filter(Boolean),
          ),
        ],
        sourceMetadata: {
          sourceUrl: `${ORIGIN}/api/cinemas/events/cinema/${providerCinemaId}`,
          fetchedAt,
          cinemaId: show.cinemaId,
          eventId: event.id,
          movieId: event.movieId,
          auditoriumId: show.auditoriumId,
          timeZone: TIME_ZONE,
          xrefReleaseNoNamespace: "unverified",
          film,
          // Eligibility and deadlines are not seat inventory or cancellation
          // status. Do not surface generic notForSaleInformation as a label.
          show,
        },
      });
    }
    if (hasScopedShow) {
      // One entry per event/version preserves raw metadata even when a movie
      // ID is reused across language versions. Identical event repeats collapse.
      movies.set(`${providerFilmId}/${eventId}`, {
        cinemaId,
        name,
        provider: "Cinetixx",
        providerFilmId,
        evidence,
        sourceMetadata: {
          sourceUrl: `${ORIGIN}/api/cinemas/events/cinema/${providerCinemaId}`,
          fetchedAt,
          cinemaId: providerCinemaId,
          eventId: event.id,
          movieId: event.movieId,
          xrefReleaseNoNamespace: "unverified",
          film,
        },
      });
    }
  }
  // A successful but empty response must not authorize schedule deletion.
  if (showings.length === 0)
    throw new Error("Cinetixx: programme contains no scoped shows");
  return { provider: "Cinetixx", movies: [...movies.values()], showings };
};
