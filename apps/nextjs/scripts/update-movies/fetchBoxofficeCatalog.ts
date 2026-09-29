import type {
  BoxofficeSiteData,
  ProviderCatalog,
} from "@waslaeuftin/cinema-providers/server";
import {
  getBoxofficeChainByDomain,
  getBoxofficeMovies,
  getBoxofficeSiteData,
} from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  BATCH_DELAY_MS,
  chunkArray,
  FetchProgressReporter,
  isCinemaStale,
  markCinemasFetched,
  sleep,
} from "@waslaeuftin/scripts/update-movies/helpers";

// Every theater's schedule comes from the same chain site, so keep the
// request rate lower than for other providers.
const BOXOFFICE_BATCH_SIZE = 3;
const BOXOFFICE_BATCH_DELAY_MS = BATCH_DELAY_MS * 10;

/**
 * Fetches all cinemas on Boxoffice/Webedia sites (Cineworld, and Everyman or
 * Showcase once they are seeded). The chain-wide site data is loaded once per
 * chain and run.
 */
export const fetchBoxofficeCatalog = async (
  progress?: FetchProgressReporter,
): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allBoxofficeCinemas = await db.cinema.findMany({
    where: {
      boxofficeTheaterId: { not: null },
      boxofficeDomain: { not: null },
    },
  });
  const boxofficeCinemas = allBoxofficeCinemas.filter((c) =>
    isCinemaStale(c.lastFetchedAt),
  );
  console.info(
    `[Boxoffice] Found ${boxofficeCinemas.length} cinemas to fetch (${allBoxofficeCinemas.length - boxofficeCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(boxofficeCinemas.length);

  const cinemasByDomain = new Map<string, typeof boxofficeCinemas>();
  for (const cinema of boxofficeCinemas) {
    const domain = cinema.boxofficeDomain!;
    cinemasByDomain.set(domain, [
      ...(cinemasByDomain.get(domain) ?? []),
      cinema,
    ]);
  }

  const fetchedCinemaIds: number[] = [];

  for (const [domain, cinemas] of cinemasByDomain) {
    let siteData: BoxofficeSiteData;
    try {
      siteData = await getBoxofficeSiteData(getBoxofficeChainByDomain(domain));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      failedCinemas.push(
        ...cinemas.map((c) => `${c.id}:${c.name} (${errorMessage})`),
      );
      await progress?.onChunkProcessed(cinemas.length, cinemas.length);
      continue;
    }

    const cinemaChunks = chunkArray(cinemas, BOXOFFICE_BATCH_SIZE);

    for (const [index, chunk] of cinemaChunks.entries()) {
      console.info(
        `[Boxoffice][${siteData.chain.name}][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
      );
      const cinemaResults = await Promise.allSettled(
        chunk.map((cinema) =>
          getBoxofficeMovies(cinema.id, cinema.boxofficeTheaterId!, siteData),
        ),
      );

      for (const [resultIndex, result] of cinemaResults.entries()) {
        const cinema = chunk[resultIndex];
        if (!cinema) continue;

        if (result.status === "fulfilled") {
          allMovies.push(...result.value.movies);
          allShowings.push(...result.value.showings);
          fetchedCinemaIds.push(cinema.id);
        } else {
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          failedCinemas.push(`${cinema.id}:${cinema.name} (${errorMessage})`);
        }
      }

      await progress?.onChunkProcessed(
        chunk.length,
        cinemaResults.filter((result) => result.status === "rejected").length,
      );

      if (index < cinemaChunks.length - 1) {
        await sleep(BOXOFFICE_BATCH_DELAY_MS);
      }
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(
      `Failed to fetch ${failedCinemas.length} Boxoffice cinemas: ${failedCinemas.join(", ")}`,
    );
  }

  await markCinemasFetched(fetchedCinemaIds);

  return { movies: allMovies, showings: allShowings };
};
