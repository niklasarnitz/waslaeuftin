import { load } from "cheerio";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  describeFailedResponse,
  fetchTextWithBun,
} from "@waslaeuftin/cinema-providers/internal/fetchText";
import { readProgrammeData } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/publicProgramme";

const cinemaNumbers: Record<string, string> = {
  braunau: "90",
  bruck: "07",
  fohnsdorf: "03",
  gleisdorf: "04",
  kapfenberg: "80",
  leibnitz: "01",
  lieboch: "20",
  oberwart: "06",
  stjohann: "05",
};

type Limitations = {
  visibleFrom?: number | null;
  purchaseFrom?: number | null;
  purchaseUntil?: number | null;
};
type Attribute = { id: string; name: string };
type DieselMovie = {
  pk: string;
  id: string;
  title: string;
  origTitle?: string | null;
  productionYear?: number | null;
  length?: number | null;
  directors?: { name: string }[] | null;
  genres?: string[];
  technologyAttributes?: Attribute[];
  alternativeIds?: string[];
  trailerURL?: string | null;
  images?: { poster?: { url?: string; alt?: string | null } | null };
  limitations?: Limitations;
};
type DieselPerformance = {
  refPk: string;
  id: string;
  moviePk: string;
  cinema: string;
  timeUtc: number;
  deeplinkURL: string;
  theatreID?: string;
  theatreName?: string;
  attributes?: Attribute[];
  type?: string | null;
  limitations?: Limitations;
};
type DieselProgramme = {
  cliData: { currentCinemaId: string };
  apiData: {
    cinemas: {
      items: Record<
        string,
        {
          pk: string;
          website: string;
          scope: {
            type: string;
            cinemaDataProvider?: {
              type: string;
              dieselCinemaNumber: string;
            };
          };
        }
      >;
    };
    movies: { items: Record<string, DieselMovie> };
    extraMovies?: { items: Record<string, DieselMovie> };
    performances: { items: Record<string, DieselPerformance> };
  };
};

// These are millisecond timestamps, like timeUtc. Purchase windows restrict
// booking, not programme visibility: retain the screening and its limitations.
const isHidden = (limitations: Limitations | undefined, now: number) => {
  for (const value of [
    limitations?.visibleFrom,
    limitations?.purchaseFrom,
    limitations?.purchaseUntil,
  ]) {
    if (value != null && (!Number.isFinite(value) || value < 0))
      throw new Error("Invalid DieselKino programme limitations");
  }
  return (limitations?.visibleFrom ?? 0) > now;
};

export const getDieselKinoMovies = async (
  cinemaId: number,
  slug: string,
  request: typeof fetchTextWithBun = fetchTextWithBun,
): Promise<ProviderCatalog> => {
  if (!Object.hasOwn(cinemaNumbers, slug))
    throw new Error(`Unknown DieselKino location: ${slug}`);
  const cinemaNumber = cinemaNumbers[slug];
  const baseUrl = `https://${slug}.dieselkino.at`;
  const sourceUrl = `${baseUrl}/programmuebersicht/`;
  const response = await request(sourceUrl, {});
  if (response.status < 200 || response.status >= 300)
    throw new Error(`${sourceUrl}: ${describeFailedResponse(response)}`);
  const data = readProgrammeData<DieselProgramme>(
    load(response.body),
    "pmkinoFrontVars",
  );
  const currentCinema = data.cliData?.currentCinemaId;
  const cinema = data.apiData?.cinemas?.items?.[currentCinema];
  if (
    !currentCinema ||
    cinema?.pk !== currentCinema ||
    cinema.website !== `${baseUrl}/` ||
    cinema.scope?.type !== "single" ||
    cinema.scope.cinemaDataProvider?.type !== "dieselV2" ||
    cinema.scope.cinemaDataProvider.dieselCinemaNumber !== cinemaNumber
  ) {
    throw new Error(
      `DieselKino programme belongs to a different cinema: ${slug}`,
    );
  }
  const records = data.apiData.movies?.items;
  const performances = data.apiData.performances?.items;
  if (
    !records ||
    Array.isArray(records) ||
    typeof records !== "object" ||
    !performances ||
    Array.isArray(performances) ||
    typeof performances !== "object"
  ) {
    throw new Error(`Invalid DieselKino programme at ${sourceUrl}`);
  }
  const allMovies = { ...data.apiData.extraMovies?.items, ...records };
  const catalog: ProviderCatalog = {
    provider: "DieselKino",
    fetchedCinemaIds: [cinemaId],
    cinemaSourceKeys: { [cinemaId]: slug },
    movies: [],
    showings: [],
  };
  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const seen = new Map<string, string>();
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();
  for (const performance of Object.values(performances)) {
    const record = allMovies[performance?.moviePk];
    const dateTime = new Date(performance?.timeUtc);
    if (
      performance?.cinema !== currentCinema ||
      typeof performance.id !== "string" ||
      !performance.id.trim() ||
      record?.pk !== performance.moviePk ||
      typeof record.id !== "string" ||
      !record.id.trim() ||
      typeof record.title !== "string" ||
      !record.title.trim() ||
      !Number.isFinite(performance.timeUtc) ||
      performance.timeUtc < 1_000_000_000_000 ||
      !Number.isFinite(dateTime.getTime())
    ) {
      throw new Error(`Invalid DieselKino screening at ${sourceUrl}`);
    }
    const signature = JSON.stringify(performance);
    if (seen.has(performance.id)) {
      if (seen.get(performance.id) !== signature)
        throw new Error(`Conflicting DieselKino session: ${performance.id}`);
      continue;
    }
    seen.set(performance.id, signature);
    if (
      isHidden(record.limitations, now) ||
      isHidden(performance.limitations, now)
    )
      continue;
    // "Event" alone also labels genuine films (Filmpreis on Tour). The live
    // payload distinguishes Comedy Club by no genres/runtime, and the concert
    // relay by LIVE VIEWING. Do not exclude concert documentaries or short films.
    if (
      !record.genres?.length &&
      (/\b(?:comedy club|live viewing)\b/i.test(record.title) ||
        (record.length === 0 &&
          record.technologyAttributes?.some(
            (attribute) => attribute.id.toLowerCase() === "event",
          )))
    )
      continue;
    // Live records have null type and no cancellation flag. Refuse an unknown
    // future type rather than silently importing events or cancelled sessions.
    if (performance.type != null)
      throw new Error(`Unknown DieselKino screening type: ${performance.type}`);
    const booking = new URL(performance.deeplinkURL);
    if (
      booking.origin !== "https://kinoapi.dieselkino.at" ||
      booking.searchParams.get("cinemaNumber") !== cinemaNumber ||
      ![performance.id, `${performance.id}d`].includes(
        booking.searchParams.get("performanceId") ?? "",
      )
    )
      throw new Error(`Invalid DieselKino booking link: ${performance.id}`);
    let movie = movies.get(record.id);
    if (
      movie &&
      (movie.name !== record.title.trim() ||
        movie.sourceMetadata?.moviePk !== record.pk)
    )
      throw new Error(`Conflicting DieselKino film: ${record.id}`);
    if (!movie) {
      const trailerId = record.trailerURL
        ? /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})(?:&|$)/.exec(
            record.trailerURL,
          )?.[1]
        : undefined;
      movie = {
        cinemaId,
        name: record.title.trim(),
        provider: "DieselKino",
        providerFilmId: record.id,
        evidence: {
          originalTitle: record.origTitle?.trim() || undefined,
          productionYear:
            Number.isInteger(record.productionYear) &&
            record.productionYear! >= 1800 &&
            record.productionYear! <= 2100
              ? record.productionYear!
              : undefined,
          runtimeMinutes:
            Number.isInteger(record.length) && record.length! > 0
              ? record.length!
              : undefined,
          director:
            record.directors
              ?.map((director) => director.name.trim())
              .filter(Boolean)
              .join(", ") || undefined,
          youtubeTrailerIds: trailerId ? [trailerId] : undefined,
        },
        sourceMetadata: {
          sourceUrl,
          fetchedAt,
          cinemaPk: currentCinema,
          dieselCinemaNumber: cinemaNumber,
          moviePk: record.pk,
          alternativeIds: record.alternativeIds,
          poster: record.images?.poster,
          trailerURL: record.trailerURL,
          limitations: record.limitations,
        },
      };
      movies.set(record.id, movie);
      catalog.movies.push(movie);
    }
    catalog.showings.push({
      cinemaId,
      movieName: movie.name,
      provider: movie.provider,
      providerFilmId: movie.providerFilmId,
      providerSessionId: performance.id,
      evidence: movie.evidence,
      dateTime,
      // Keep the supplied URL verbatim, including the booking-only "d" suffix.
      bookingUrl: performance.deeplinkURL,
      showingAdditionalData: [
        performance.theatreName,
        ...(performance.attributes ?? []).map((attribute) => attribute.name),
      ].filter((value): value is string => Boolean(value)),
      sourceMetadata: {
        sourceUrl,
        fetchedAt,
        cinemaPk: currentCinema,
        dieselCinemaNumber: cinemaNumber,
        moviePk: performance.moviePk,
        refPk: performance.refPk,
        theatreID: performance.theatreID,
        limitations: performance.limitations,
      },
    });
  }
  if (!catalog.showings.length)
    throw new Error(`No DieselKino film screenings found at ${sourceUrl}`);
  return catalog;
};
