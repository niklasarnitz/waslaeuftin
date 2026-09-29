import {
  getOdeonApiConfig,
  getOdeonMovies,
  ProviderCatalog,
} from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  FetchProgressReporter,
  isCinemaStale,
  markCinemasFetched,
  sleep,
} from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchOdeonCatalog = async (
  progress?: FetchProgressReporter,
): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allOdeonCinemas = await db.cinema.findMany({
    where: { odeonCinemaId: { not: null } },
  });
  const odeonCinemas = allOdeonCinemas.filter((c) =>
    isCinemaStale(c.lastFetchedAt),
  );
  console.info(
    `[Odeon] Found ${odeonCinemas.length} cinemas to fetch (${allOdeonCinemas.length - odeonCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(odeonCinemas.length);

  if (odeonCinemas.length > 0) {
    // All cinemas share one API token scraped from odeon.co.uk. Get it up
    // front so a blocked home page fails the run with one clear error.
    await getOdeonApiConfig();
  }

  const cinemaChunks = chunkArray(odeonCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Odeon][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) => getOdeonMovies(cinema.id, cinema.odeonCinemaId!)),
    );

    for (const [resultIndex, result] of cinemaResults.entries()) {
      const cinema = chunk[resultIndex];
      if (!cinema) continue;

      if (result.status === "fulfilled") {
        allMovies.push(...result.value.movies);
        allShowings.push(...result.value.showings.flat());
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
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(
      `Failed to fetch ${failedCinemas.length} Odeon cinemas: ${failedCinemas.join(", ")}`,
    );
  }

  await markCinemasFetched(odeonCinemas.map((c) => c.id));

  return { movies: allMovies, showings: allShowings };
};
