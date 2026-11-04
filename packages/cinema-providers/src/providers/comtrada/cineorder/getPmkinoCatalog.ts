import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  fetchProgramme,
  readProgrammeData,
} from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/publicProgramme";

type PmkinoMovie = {
  id: string;
  title: string;
  origTitle?: string | null;
  productionYear?: number | null;
  length?: number | null;
  directors?: { name: string }[] | null;
};

type PmkinoProgramme = {
  cliData: { currentCinemaId: string };
  apiData: {
    cinemas: {
      items: Record<
        string,
        {
          scope: {
            cinemaDataProvider: { shopCenterId: string; shopUrl: string };
          };
        }
      >;
    };
    movies: { items: Record<string, PmkinoMovie> };
    extraMovies: { items: Record<string, PmkinoMovie> };
    performances: {
      items: Record<
        string,
        {
          id: string;
          moviePk: string;
          cinema: string;
          timeUtc: number;
          theatreName?: string;
          attributes?: { name: string }[];
        }
      >;
    };
  };
};

export const getPmkinoCatalog = async (
  cinemaId: number,
  baseUrl: string,
  centerId: string,
): Promise<ProviderCatalog> => {
  const $ = await fetchProgramme(`${baseUrl}/programmuebersicht/`);
  const data = readProgrammeData<PmkinoProgramme>($, "pmkinoFrontVars");
  const currentCinema = data.cliData.currentCinemaId;
  const booking =
    data.apiData.cinemas.items[currentCinema]?.scope.cinemaDataProvider;
  if (booking?.shopCenterId !== centerId) {
    throw new Error(
      `Public programme belongs to a different cinema: ${baseUrl}`,
    );
  }
  const records = {
    ...data.apiData.extraMovies.items,
    ...data.apiData.movies.items,
  };
  const catalog: ProviderCatalog = { movies: [], showings: [] };
  const movies = new Map<string, ProviderCatalog["movies"][number]>();
  const seen = new Set<string>();
  for (const performance of Object.values(data.apiData.performances.items)) {
    if (performance.cinema !== currentCinema || seen.has(performance.id))
      continue;
    const record = records[performance.moviePk];
    const dateTime = new Date(performance.timeUtc);
    if (
      !record?.id ||
      !record.title?.trim() ||
      !Number.isFinite(performance.timeUtc) ||
      !Number.isFinite(dateTime.getTime())
    ) {
      throw new Error(
        `Invalid programme screening ${performance.id} at ${baseUrl}`,
      );
    }
    seen.add(performance.id);
    let movie = movies.get(record.id);
    if (!movie) {
      movie = {
        cinemaId,
        name: record.title,
        provider: "ComtradaCineOrder",
        providerFilmId: record.id,
        evidence: {
          originalTitle:
            record.origTitle
              ?.trim()
              .replace(/^(.*),\s*(The|A|An|Der|Die|Das)$/i, "$2 $1") ||
            undefined,
          // Filmpalast publishes placeholder years (1999 for new releases)
          // and incorrect years for older films. Do not turn that field into
          // an identity constraint; titles, directors and runtimes still apply.
          productionYear:
            new URL(baseUrl).hostname !== "filmpalast.net" &&
            record.productionYear &&
            record.productionYear >= 1800 &&
            record.productionYear <= 2100
              ? record.productionYear
              : undefined,
          runtimeMinutes:
            record.length && record.length > 0 ? record.length : undefined,
          director:
            record.directors
              ?.map((director) => director.name)
              .filter(Boolean)
              .join(", ") || undefined,
        },
      };
      movies.set(record.id, movie);
      catalog.movies.push(movie);
    }
    const bookingUrl = new URL("landingpage", booking.shopUrl);
    bookingUrl.search = new URLSearchParams({
      center: centerId,
      language: "DE",
      page: "seatingplan",
      performance: performance.id,
    }).toString();
    catalog.showings.push({
      cinemaId,
      movieName: movie.name,
      provider: movie.provider,
      providerFilmId: movie.providerFilmId,
      providerSessionId: performance.id,
      evidence: movie.evidence,
      dateTime,
      bookingUrl: bookingUrl.href,
      showingAdditionalData: [
        performance.theatreName,
        ...(performance.attributes ?? []).map((attribute) => attribute.name),
      ].filter((value): value is string => Boolean(value)),
    });
  }
  if (catalog.showings.length === 0)
    throw new Error(`No programme screenings found at ${baseUrl}`);
  return catalog;
};
