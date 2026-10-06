import type { ProviderFetchOptions } from "@waslaeuftin/scripts/update-movies/helpers";
import {
  getComtradaCineOrderMovies,
  ProviderCatalog,
} from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  FetchProgressReporter,
  markCinemasFetched,
  shouldFetchCinema,
  sleep,
} from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchComtradaCineOrderCatalog = async (
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allComtradaCinemas = await db.cinema.findMany({
    where: { comtradaCineOrderMetadata: { isNot: null } },
    include: { comtradaCineOrderMetadata: true },
  });
  const comtradaCinemas = allComtradaCinemas.filter((c) =>
    shouldFetchCinema(c.lastFetchedAt, options),
  );
  console.info(
    `[Comtrada] Found ${comtradaCinemas.length} cinemas to fetch (${allComtradaCinemas.length - comtradaCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(comtradaCinemas.length);

  const cinemaChunks = chunkArray(comtradaCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getComtradaCineOrderMovies(
          cinema.id,
          cinema.comtradaCineOrderMetadata!,
        ),
      ),
    );

    for (const [resultIndex, result] of cinemaResults.entries()) {
      const cinema = chunk[resultIndex];
      if (!cinema) continue;

      if (result.status === "fulfilled") {
        allMovies.push(...result.value.movies);
        allShowings.push(...result.value.showings);
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
      `Failed to fetch ${failedCinemas.length} Comtrada cinemas: ${failedCinemas.join(", ")}`,
    );
  }

  await markCinemasFetched(comtradaCinemas.map((c) => c.id));

  return { movies: allMovies, showings: allShowings };
};
