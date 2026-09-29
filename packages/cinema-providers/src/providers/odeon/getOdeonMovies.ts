import moment from "moment-timezone";

import type {
  OdeonAttribute,
  OdeonFilmScreeningDatesResponse,
  OdeonShowtime,
  OdeonShowtimesResponse,
} from "@waslaeuftin/cinema-providers/internal/providers/odeon/types/OdeonOcapi";
import type { RawProviderMovie } from "@waslaeuftin/cinema-providers/internal/RawProviderMovie";
import type { RawProviderShowing } from "@waslaeuftin/cinema-providers/internal/RawProviderShowing";
import {
  getOdeonJson,
  ODEON_BASE_URL,
} from "@waslaeuftin/cinema-providers/internal/providers/odeon/odeonApi";

export const ODEON_TIME_ZONE = "Europe/London";

// Business dates fetched in parallel per cinema.
const DATE_CONCURRENCY = 3;

// Attributes that are on (nearly) every showing, pricing labels or internal
// promotion tags: they add nothing to a listing.
const IGNORED_ATTRIBUTES = new Set(
  ["Watchword", "Wheelchair Accessible", "Saver"].map((name) =>
    name.toLowerCase(),
  ),
);

// Pricing labels such as "£1 web" or "£5 web".
const isPriceAttribute = (name: string) => /^£\d/.test(name);

// Odeon's attribute names mapped to the labels we show. Keep "English" out of
// the labels: the OV tag matches it, and English is the default in the UK.
const ATTRIBUTE_LABELS: Record<string, string> = {
  "3d": "3D",
  "70mm": "70mm",
  "audio described": "Audio Described",
  "autism friendly": "Autism Friendly",
  dolby: "Dolby Cinema",
  "english (sub)": "Subtitled",
  imax: "IMAX",
  isense: "iSense",
  laser: "Laser",
  "open captioned": "Open Captioned",
  relaxed: "Relaxed",
  xl: "XL",
};

const normalizeAttributeName = (name: string) =>
  name
    .trim()
    // "3D - Web ", "XL Web", "70mm Web"
    .replace(/\s*-?\s*web$/i, "")
    .trim();

export const getOdeonAttributeLabel = (
  attribute: Pick<OdeonAttribute, "name">,
): string | undefined => {
  const name = normalizeAttributeName(attribute.name.text);
  const key = name.toLowerCase();
  if (!name || IGNORED_ATTRIBUTES.has(key) || isPriceAttribute(name)) {
    return undefined;
  }

  const label = ATTRIBUTE_LABELS[key];
  if (label) return label;

  // "Hindi (Audio)" -> "Hindi audio"
  const audioLanguage = /^(.+?)\s*\(audio\)$/i.exec(name)?.[1];
  if (audioLanguage) return `${audioLanguage} audio`;

  // "French (Sub)" -> "French subtitles"
  const subtitleLanguage = /^(.+?)\s*\(sub\)$/i.exec(name)?.[1];
  if (subtitleLanguage) return `${subtitleLanguage} subtitles`;

  return name;
};

export const getOdeonBookingUrl = (showtimeId: string) =>
  `${ODEON_BASE_URL}/ticketing/seat-picker/?showtimeId=${encodeURIComponent(showtimeId)}`;

/** OCAPI times carry an offset; anything without one is London local time. */
export const parseOdeonDateTime = (value: string) =>
  moment.tz(value, moment.ISO_8601, ODEON_TIME_ZONE).toDate();

const isPrivateHire = (title: string) => /private\s*hire/i.test(title);

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index] as T);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
};

export const mapOdeonShowtimes = (
  cinemaId: number,
  responses: OdeonShowtimesResponse[],
) => {
  const movies = new Map<string, RawProviderMovie>();
  const showings: RawProviderShowing[] = [];

  for (const { showtimes, relatedData } of responses) {
    const films = new Map(relatedData.films.map((film) => [film.id, film]));
    const screens = new Map(
      relatedData.screens.map((screen) => [screen.id, screen]),
    );
    const attributes = new Map(
      relatedData.attributes.map((attribute) => [attribute.id, attribute]),
    );

    for (const showtime of showtimes) {
      const movieName = films.get(showtime.filmId)?.title.text.trim();
      if (!movieName || isPrivateHire(movieName)) continue;

      movies.set(movieName, { name: movieName, cinemaId });
      showings.push({
        cinemaId,
        movieName,
        dateTime: parseOdeonDateTime(showtime.schedule.startsAt),
        bookingUrl: getOdeonBookingUrl(showtime.id),
        showingAdditionalData: getShowingAdditionalData(
          showtime,
          screens.get(showtime.screenId)?.name.text,
          attributes,
        ),
      });
    }
  }

  return { movies: Array.from(movies.values()), showings };
};

const getShowingAdditionalData = (
  showtime: OdeonShowtime,
  screenName: string | undefined,
  attributes: Map<string, OdeonAttribute>,
) => {
  const labels = showtime.attributeIds.flatMap((attributeId) => {
    const attribute = attributes.get(attributeId);
    const label = attribute ? getOdeonAttributeLabel(attribute) : undefined;
    return label ? [label] : [];
  });

  if (showtime.requires3dGlasses) labels.push("3D");

  return Array.from(
    new Set([...(screenName ? [screenName.trim()] : []), ...labels]),
  );
};

export const getOdeonMovies = async (cinemaId: number, siteId: string) => {
  const { filmScreeningDates } =
    await getOdeonJson<OdeonFilmScreeningDatesResponse>(
      `/ocapi/v1/film-screening-dates?siteIds=${encodeURIComponent(siteId)}`,
    );

  const responses = await mapWithConcurrency(
    filmScreeningDates.map(({ businessDate }) => businessDate),
    DATE_CONCURRENCY,
    (businessDate) =>
      getOdeonJson<OdeonShowtimesResponse>(
        `/ocapi/v1/showtimes/by-business-date/${businessDate}?siteIds=${encodeURIComponent(siteId)}`,
      ),
  );

  return mapOdeonShowtimes(cinemaId, responses);
};
