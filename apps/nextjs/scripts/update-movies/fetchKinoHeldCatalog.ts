import type { ProviderFetchOptions } from "@waslaeuftin/scripts/update-movies/helpers";
import {
  getKinoHeldMovies,
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

export const fetchKinoHeldCatalog = async (
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allKinoHeldCinemas = await db.cinema.findMany({
    where: {
      kinoHeldCinemasMetadata: { isNot: null },
      cinemaxxVueCinemasMetadataId: null,
    },
    include: { kinoHeldCinemasMetadata: true },
  });
  const kinoHeldCinemas = allKinoHeldCinemas.filter((c) =>
    shouldFetchCinema(c.lastFetchedAt, options),
  );
  console.info(
    `[KinoHeld] Found ${kinoHeldCinemas.length} cinemas to fetch (${allKinoHeldCinemas.length - kinoHeldCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(kinoHeldCinemas.length);

  const cinemaChunks = chunkArray(kinoHeldCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[KinoHeld][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!),
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
      `Failed to fetch ${failedCinemas.length} KinoHeld cinemas: ${failedCinemas.join(", ")}`,
    );
  }

  return {
    movies: allMovies,
    showings: allShowings,
    fetchedCinemaIds: kinoHeldCinemas.map((cinema) => cinema.id),
  };
};
