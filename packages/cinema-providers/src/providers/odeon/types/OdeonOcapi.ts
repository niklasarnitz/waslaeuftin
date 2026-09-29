// Types for ODEON's Vista OCAPI v1 (https://vwc.odeon.co.uk/WSVistaWebClient).
//
// The example payloads below are trimmed from real responses for ODEON Luxe
// Leicester Square (site 153), recorded on 2026-07-11.

/** Localised text as returned by OCAPI: `{ "text": "Screen 4", "translations": [] }`. */
export type OdeonText = {
  text: string;
  translations: unknown[];
};

/**
 * `window.initialData.api` on odeon.co.uk:
 *
 * ```json
 * {
 *   "apiUrl": "https://vwc.odeon.co.uk/WSVistaWebClient",
 *   "authToken": "eyJhbGciOiJSUzI1NiIs...",
 *   "vistaCdn": "https://vwc.odeon.co.uk/CDN",
 *   "movieExchangeCdn": "https://film-cdn.moviexchange.com/api/cdn",
 *   "regionCode": "..."
 * }
 * ```
 *
 * The token is a JWT issued by auth.moviexchange.com for "Odeon Website -
 * Production" and is valid for 12 hours.
 */
export type OdeonApiConfig = {
  apiUrl: string;
  authToken: string;
  /** Token expiry in milliseconds since epoch, from the JWT `exp` claim. */
  expiresAt?: number;
};

/**
 * `GET /ocapi/v1/film-screening-dates?siteIds=153`
 *
 * ```json
 * {
 *   "filmScreeningDates": [
 *     {
 *       "businessDate": "2026-07-11",
 *       "filmScreenings": [
 *         {
 *           "filmId": "HO00008565",
 *           "sites": [{ "siteId": "153", "showtimeAttributeIds": ["0000000006", "0000000208"] }]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type OdeonFilmScreeningDatesResponse = {
  filmScreeningDates: {
    businessDate: string;
    filmScreenings?: {
      filmId: string;
      sites: { siteId: string; showtimeAttributeIds: string[] }[];
    }[];
  }[];
};

/**
 * A showtime from `GET /ocapi/v1/showtimes/by-business-date/2026-07-11?siteIds=153`.
 *
 * ```json
 * {
 *   "id": "153-38894",
 *   "schedule": {
 *     "businessDate": "2026-07-11",
 *     "startsAt": "2026-07-11T19:00:00+01:00",
 *     "endsAt": "2026-07-11T20:55:00+01:00",
 *     "filmStartsAt": "2026-07-11T19:25:00+01:00",
 *     "filmEndsAt": "2026-07-11T20:55:00+01:00",
 *     "inSeatItemDelivery": null
 *   },
 *   "isSoldOut": false,
 *   "seatLayoutId": "153-3-39",
 *   "filmId": "HO00008565",
 *   "siteId": "153",
 *   "screenId": "153-3",
 *   "areaCategories": [{ "areaCategoryId": "153-0000000010", "isAllocatedSeating": true }],
 *   "attributeIds": ["0000000006", "0000000208"],
 *   "isAllocatedSeating": true,
 *   "requires3dGlasses": false,
 *   "eventId": null,
 *   "restrictions": ["FilmAdvanceBookingRule"],
 *   "filmAdvanceBookingRuleId": "153-76-HO00008565"
 * }
 * ```
 *
 * `startsAt` is the advertised (door) time the website shows; `filmStartsAt`
 * is after the ads and trailers.
 */
export type OdeonShowtime = {
  id: string;
  schedule: {
    businessDate: string;
    startsAt: string;
    endsAt: string;
    filmStartsAt?: string;
    filmEndsAt?: string;
  };
  isSoldOut: boolean;
  filmId: string;
  siteId: string;
  screenId: string;
  attributeIds: string[];
  requires3dGlasses: boolean;
  eventId: string | null;
};

/**
 * ```json
 * {
 *   "id": "HO00008218",
 *   "title": { "text": "Toy Story 5", "translations": [] },
 *   "synopsis": { "text": "The toys are back in Disney and Pixar’s ...", "translations": [] },
 *   "censorRatingId": "0000000009",
 *   "releaseDate": "2026-06-19",
 *   "runtimeInMinutes": 102,
 *   "trailerUrl": "https://www.youtube.com/watch?v=RFm6wN7IhtY",
 *   "castAndCrew": [{ "castAndCrewMemberId": "0000002721", "roles": ["Director"] }],
 *   "genreIds": ["0000000004", "0000000006", "0000000010"],
 *   "externalIds": { "moviexchangeReleaseId": "e4e53d03-...", "corporateId": null },
 *   "hopk": "HO00008218",
 *   "hoCode": "A000009312",
 *   "eventId": null,
 *   "distributorName": "WALT DISNEY STUDIOS INTERNTL"
 * }
 * ```
 */
export type OdeonFilm = {
  id: string;
  title: OdeonText;
  synopsis?: OdeonText | null;
  releaseDate?: string | null;
  runtimeInMinutes?: number | null;
  trailerUrl?: string | null;
  distributorName?: string | null;
};

/**
 * ```json
 * {
 *   "id": "0000000149",
 *   "name": { "text": "Dolby", "translations": [] },
 *   "shortName": { "text": "Dolby", "translations": [] },
 *   "description": { "text": "Dolby Cinema™ combines the most powerful image and sound technologies ...", "translations": [] },
 *   "importantMessage": null,
 *   "displayPriority": 1,
 *   "isPromoted": false
 * }
 * ```
 *
 * Names seen across London sites: Audio Described, Wheelchair Accessible,
 * Flash Warning, ODEON Luxe, Saver, Laser, iSense, IMAX, Watchword, Event
 * Cinema, "3D - Web ", Open Captioned, XL Web, English (Sub), Dolby, Recliner,
 * Hindi (Audio), ODEON Kids, Korean (Audio), £1 web, 70mm Web, Silver Cinema,
 * Newbies, Autism Friendly, Encore.
 */
export type OdeonAttribute = {
  id: string;
  name: OdeonText;
  shortName?: OdeonText | null;
  description?: OdeonText | null;
  displayPriority?: number;
  isPromoted?: boolean;
};

/** `{ "id": "153-4", "name": { "text": "Screen 4", "translations": [] } }` */
export type OdeonScreen = {
  id: string;
  name: OdeonText;
};

/**
 * A site, as in `relatedData.sites` of the showtimes response and in
 * `GET /ocapi/v1/sites`:
 *
 * ```json
 * {
 *   "id": "153",
 *   "name": { "text": "London Leicester Square", "translations": [] },
 *   "location": { "latitude": 51.5104, "longitude": -0.1293 },
 *   "contactDetails": {
 *     "phoneNumbers": [],
 *     "email": null,
 *     "address": { "line1": "22-24 Leicester Square", "line2": "", "city": "London" }
 *   },
 *   "ianaTimeZoneName": "Europe/London"
 * }
 * ```
 */
export type OdeonSite = {
  id: string;
  name: OdeonText;
  location?: { latitude: number; longitude: number } | null;
  contactDetails?: {
    address?: {
      line1?: string | null;
      line2?: string | null;
      line3?: string | null;
      city?: string | null;
      state?: string | null;
      postCode?: string | null;
    } | null;
  } | null;
  ianaTimeZoneName?: string | null;
  isAvailableForSale?: boolean;
};

/**
 * `GET /ocapi/v1/showtimes/by-business-date/2026-07-11?siteIds=153`
 *
 * ```json
 * {
 *   "businessDate": "2026-07-11",
 *   "showtimes": [ OdeonShowtime, ... ],
 *   "relatedData": {
 *     "sites": [ OdeonSite ],
 *     "films": [ OdeonFilm, ... ],
 *     "castAndCrew": [...],
 *     "genres": [{ "id": "0000000001", "name": { "text": "Action", "translations": [] }, "description": null }],
 *     "censorRatings": [{ "id": "0000000009", "classification": { "text": "PG", "translations": [] }, ... }],
 *     "attributes": [ OdeonAttribute, ... ],
 *     "screens": [ OdeonScreen, ... ],
 *     "events": [],
 *     "filmAdvanceBookingRules": [...],
 *     "areaCategories": [...]
 *   }
 * }
 * ```
 */
export type OdeonShowtimesResponse = {
  businessDate: string;
  showtimes: OdeonShowtime[];
  relatedData: {
    sites: OdeonSite[];
    films: OdeonFilm[];
    attributes: OdeonAttribute[];
    screens: OdeonScreen[];
  };
};

/** `GET /ocapi/v1/sites` */
export type OdeonSitesResponse = {
  sites: OdeonSite[];
};
