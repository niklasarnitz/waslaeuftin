import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { type ProviderCatalog } from "./resolveMovieTitles";

export const fetchCineStarCatalog = async (): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allCinestarCinemas = await db.cinema.findMany({
    where: { cineStarCinemaId: { not: null } },
  });
  const cinestarCinemas = allCinestarCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
  console.info(`[CineStar] Found ${cinestarCinemas.length} cinemas to fetch (${allCinestarCinemas.length - cinestarCinemas.length} skipped, recently fetched)`);

  const cinemaChunks = chunkArray(cinestarCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(`[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) => getCineStarMovies(cinema.id, cinema.cineStarCinemaId!)),
    );

    for (const [resultIndex, result] of cinemaResults.entries()) {
      const cinema = chunk[resultIndex];
      if (!cinema) continue;

      if (result.status === "fulfilled") {
        allMovies.push(...result.value.movies);
        allShowings.push(...result.value.showings.flat());
      } else {
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failedCinemas.push(`${cinema.id}:${cinema.name} (${errorMessage})`);
      }
    }

    if (index < cinemaChunks.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(`Failed to fetch ${failedCinemas.length} CineStar cinemas: ${failedCinemas.join(", ")}`);
  }

  await markCinemasFetched(cinestarCinemas.map((c) => c.id));

  return { movies: allMovies, showings: allShowings };
};
