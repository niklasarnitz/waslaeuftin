// Types for the Boxoffice API behind Webedia's Gatsby cinema sites (Cineworld,
// Everyman, Showcase, ...). Only the fields we read are typed. The examples are
// trimmed from real Cineworld responses (build 2026-09-17).

/**
 * `GET {assetPrefix}page-data/{listingPath}/page-data.json`, where the asset
 * prefix is the part before `webpack-runtime-` in a `<script src>` of the
 * listing page, e.g.
 * `https://cms-assets.webediamovies.pro/prod/cineworld-cinemas/2026-09-17/public/`.
 *
 * @example
 * {
 *   "componentChunkName": "component---src-templates-page-tsx",
 *   "path": "/cinemas",
 *   "result": { "data": { ... } },
 *   "staticQueryHashes": ["1575531621", "1847294491", "2506275789", "3836549025", ...],
 *   "slicesMap": {}
 * }
 */
export interface BoxofficePageData {
  staticQueryHashes?: string[];
}

/**
 * `GET {assetPrefix}page-data/sq/d/{hash}.json`. Every static query returns a
 * different `data` shape; we look for these three.
 */
export interface BoxofficeStaticQuery {
  data?: {
    allMovie?: { nodes: BoxofficeMovieNode[] };
    allAttribute?: { nodes: BoxofficeAttributeNode[] };
    allTheater?: { nodes: (BoxofficeTheaterNode | BoxofficeTheaterStub)[] };
  };
}

/**
 * Movie as listed in the site build (`data.allMovie.nodes`). Only covers the
 * movies known when the site was built; the schedule can contain newer ones.
 *
 * @example
 * {
 *   "id": "282076",
 *   "path": "/films/282076-project-hail-mary",
 *   "title": "Project Hail Mary",
 *   "originalTitle": "Project Hail Mary",
 *   "runtime": null,
 *   "theaters": [
 *     { "th": "X06V1", "tags": ["Auditorium.Experience.4dx", "Format.Projection.Digital"], "firstShowtimeDate": "2026-09-18" }
 *   ]
 * }
 */
export interface BoxofficeMovieNode {
  id: string;
  path: string | null;
  title: string;
  originalTitle?: string | null;
}

/**
 * Attribute label, one per theater and tag (`data.allAttribute.nodes`). The
 * ID is `{theaterId}_{tag}`. Combined attributes (e.g. "IMAX 3D") list the
 * tags they stand for in `combinedTags`.
 *
 * @example
 * {
 *   "id": "X06V1_Format.Projection.Imax",
 *   "tag": "Format.Projection.Imax",
 *   "weight": 5,
 *   "localizations": [{
 *     "label": "IMAX",
 *     "locale": "en-GB",
 *     "tag": "Format.Projection.Imax",
 *     "theater": { "id": "X06V1" },
 *     "combinedTags": null,
 *     "description": "An IMAX presentation using a large-format screen, ...",
 *     "type": "CustomAttribute"
 *   }]
 * }
 * @example
 * {
 *   "id": "X06V1_Custom.CombinedAttribute.16b01330a4fc490989531acce4b3884c",
 *   "tag": "Custom.CombinedAttribute.16b01330a4fc490989531acce4b3884c",
 *   "localizations": [{
 *     "label": "IMAX 3D",
 *     "combinedTags": ["Format.Projection.Imax", "Format.Projection.3d"],
 *     ...
 *   }]
 * }
 */
export interface BoxofficeAttributeNode {
  id: string;
  tag: string;
  weight?: number | null;
  localizations: {
    label: string | null;
    locale?: string | null;
    combinedTags?: string[] | null;
    description?: string | null;
  }[];
}

/**
 * Theater with its practical info (`data.allTheater.nodes` of one of the
 * static queries; another one only has `{ id, ticketingProvider }`).
 *
 * Don't trust `timeZone`: some UK theaters say "Europe/Paris".
 *
 * @example
 * {
 *   "id": "X06V1",
 *   "path": "/theaters/x06v1-cineworld-cinema-london-leicester-square",
 *   "name": "London - Leicester Square",
 *   "timeZone": "Europe/London",
 *   "country": { "name": "United Kingdom", "iso31661A2": "GB" },
 *   "practicalInfo": {
 *     "closed": false,
 *     "temporaryClosure": null,
 *     "coordinates": { "latitude": 51.5108, "longitude": -0.1304 },
 *     "location": {
 *       "zip": "WC2H 7NA",
 *       "state": "England",
 *       "country": "United Kingdom",
 *       "city": "London",
 *       "address": "5-6 Leicester Square"
 *     }
 *   }
 * }
 */
export interface BoxofficeTheaterNode {
  id: string;
  path: string | null;
  name: string;
  timeZone?: string | null;
  country?: { name: string; iso31661A2: string } | null;
  practicalInfo: {
    closed?: boolean | null;
    coordinates?: { latitude: number; longitude: number } | null;
    location?: {
      zip?: string | null;
      state?: string | null;
      country?: string | null;
      city?: string | null;
      address?: string | null;
    } | null;
  };
}

export interface BoxofficeTheaterStub {
  id: string;
  ticketingProvider?: string | null;
}

/**
 * `GET {domain}/api/gatsby-source-boxofficeapi/schedule?theaters={"id":"X06V1","timeZone":"Europe/London"}&from=2026-09-17T00:00:00&to=2027-09-17T23:59:59`
 *
 * Keyed by theater ID, then movie ID, then local date.
 *
 * @example
 * {
 *   "X06V1": {
 *     "schedule": {
 *       "363": {
 *         "2026-09-20": [{
 *           "id": "363-2026-09-20 19:30:00-Format.Projection.Digital,Showtime.Event.BigScreenClassics",
 *           "startsAt": "2026-09-20T19:30:00",
 *           "tags": ["Format.Projection.Digital", "Showtime.Event.BigScreenClassics"],
 *           "isExpired": false,
 *           "data": {
 *             "ticketing": [
 *               { "urls": ["https://web.cineworld.co.uk/order/showtimes/103-119881/seats"], "type": "DESKTOP", "provider": "default" },
 *               { "urls": ["https://relay.mvtx.us/ticketing/dbz?code_theater=X06V1&..."], "type": "DESKTOP", "provider": "relay" }
 *             ]
 *           },
 *           "occupancy": { "rate": null },
 *           "nextShowtimes": []
 *         }]
 *       }
 *     },
 *     "moviesTags": { "363": ["Format.Projection.Digital", "Showtime.Event.BigScreenClassics"] },
 *     "showtimesDates": ["2026-09-17", "2026-09-18", ...]
 *   }
 * }
 */
export type BoxofficeScheduleResponse = Record<
  string,
  | {
      schedule?: Record<string, Record<string, BoxofficeShowtime[]>> | null;
    }
  | undefined
>;

export interface BoxofficeShowtime {
  id: string;
  /** Theater-local time without offset, e.g. "2026-09-20T19:30:00". */
  startsAt: string;
  tags?: string[] | null;
  isExpired?: boolean | null;
  data?: {
    ticketing?:
      | {
          urls?: string[] | null;
          type?: string | null;
          provider?: string | null;
        }[]
      | null;
  } | null;
  /** Only set on some showtimes, e.g. { "name": "4" }. */
  screen?: { name?: string | null } | null;
}

/**
 * `GET {domain}/api/gatsby-source-boxofficeapi/movies?basic=false&ids=282076&ids=...`
 *
 * @example
 * [{
 *   "id": "1000051403",
 *   "title": "(ne)tobuli melagiai",
 *   "runtime": null,
 *   "genres": "Comedy, Drama",
 *   "__typename": "Movie",
 *   "locale": { "title": "(ne)tobuli melagiai", "synopsis": "One table. Seven phones. ..." }
 * }]
 */
export interface BoxofficeMovieDetails {
  id: string;
  title: string;
  locale?: { title?: string | null } | null;
}
