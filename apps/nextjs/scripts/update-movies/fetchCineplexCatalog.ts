import type { ProviderFetchOptions } from "@waslaeuftin/scripts/update-movies/helpers";
import {
  getCineplexMovies,
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

export const fetchCineplexCatalog = async (
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allCineplexCinemas = await db.cinema.findMany({
    where: { cineplexCinemaId: { not: null } },
  });
  const cineplexCinemas = allCineplexCinemas.filter((c) =>
    shouldFetchCinema(c.lastFetchedAt, options),
  );
  console.info(
    `[Cineplex] Found ${cineplexCinemas.length} cinemas to fetch (${allCineplexCinemas.length - cineplexCinemas.length} skipped, recently fetched)`,
  );

  await progress?.onCinemasSelected(cineplexCinemas.length);

  const cinemaChunks = chunkArray(cineplexCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const { movies, showings } = await getCineplexMovies(
      chunk.map((cinema) => ({
        cinemaId: cinema.id,
        cineplexCinemaId: cinema.cineplexCinemaId!,
      })),
    );

    allMovies.push(...movies);
    allShowings.push(...showings);

    await progress?.onChunkProcessed(chunk.length, 0);

    if (index < cinemaChunks.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  await markCinemasFetched(cineplexCinemas.map((c) => c.id));

  return { movies: allMovies, showings: allShowings };
};
