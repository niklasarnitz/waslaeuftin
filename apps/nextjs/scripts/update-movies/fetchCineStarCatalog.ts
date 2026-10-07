import type { ProviderFetchOptions } from "@waslaeuftin/scripts/update-movies/helpers";
import {
  getCineStarMovies,
  ProviderCatalog,
} from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  FetchProgressReporter,
  shouldFetchCinema,
  sleep,
} from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchCineStarCatalog = async (
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allCinestarCinemas = await db.cinema.findMany({
    where: { cineStarCinemaId: { not: null } },
  });
  const cinestarCinemas = allCinestarCinemas.filter((c) =>
    shouldFetchCinema(c.lastFetchedAt, options),
  );
  console.info(
    `[CineStar] Found ${cinestarCinemas.length} cinemas to fetch (${allCinestarCinemas.length - cinestarCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(cinestarCinemas.length);

  const cinemaChunks = chunkArray(cinestarCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getCineStarMovies(cinema.id, cinema.cineStarCinemaId!),
      ),
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
      `Failed to fetch ${failedCinemas.length} CineStar cinemas: ${failedCinemas.join(", ")}`,
    );
  }

  return {
    movies: allMovies,
    showings: allShowings,
    fetchedCinemaIds: cinestarCinemas.map((cinema) => cinema.id),
  };
};
