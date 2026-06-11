import {
  getCinfinityMovies,
  ProviderCatalog,
} from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  isCinemaStale,
  markCinemasFetched,
  sleep,
} from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchCinfinityCatalog = async (): Promise<ProviderCatalog> => {
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allCinfinityCinemas = await db.cinema.findMany({
    where: { cinfinityCinemaId: { not: null } },
  });
  const cinfinityCinemas = allCinfinityCinemas.filter((cinema) =>
    isCinemaStale(cinema.lastFetchedAt),
  );
  console.info(
    `[Cinfinity] Found ${cinfinityCinemas.length} cinemas to fetch (${allCinfinityCinemas.length - cinfinityCinemas.length} skipped, recently fetched)`,
  );

  const cinemaChunks = chunkArray(cinfinityCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Cinfinity][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`,
    );
    const { movies, showings } = await getCinfinityMovies(
      chunk.map((cinema) => ({
        cinemaId: cinema.id,
        cinfinityCinemaId: cinema.cinfinityCinemaId!,
      })),
    );

    allMovies.push(...movies);
    allShowings.push(...showings);

    if (index < cinemaChunks.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  await markCinemasFetched(cinfinityCinemas.map((cinema) => cinema.id));

  return { movies: allMovies, showings: allShowings };
};
