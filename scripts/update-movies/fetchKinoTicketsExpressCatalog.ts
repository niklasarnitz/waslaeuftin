import { getKinoTicketsExpressMovies } from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";
import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { type ProviderCatalog } from "./resolveMovieTitles";

export const fetchKinoTicketsExpressCatalog = async (): Promise<ProviderCatalog> => {
  const failedCinemas: string[] = [];
  const allMovies: ProviderCatalog["movies"] = [];
  const allShowings: ProviderCatalog["showings"] = [];

  const allKinoTicketsExpressCinemas = await db.cinema.findMany({
    where: { isKinoTicketsExpress: true },
  });
  const kinoTicketsExpressCinemas = allKinoTicketsExpressCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
  console.info(`[KinoTicketsExpress] Found ${kinoTicketsExpressCinemas.length} cinemas to fetch (${allKinoTicketsExpressCinemas.length - kinoTicketsExpressCinemas.length} skipped, recently fetched)`);

  const cinemaChunks = chunkArray(kinoTicketsExpressCinemas, CINEMA_BATCH_SIZE);

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(`[KinoTicketsExpress][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) => getKinoTicketsExpressMovies(cinema.id, cinema.slug)),
    );

    for (const [resultIndex, result] of cinemaResults.entries()) {
      const cinema = chunk[resultIndex];
      if (!cinema) continue;

      if (result.status === "fulfilled") {
        allMovies.push(...result.value.movies);
        allShowings.push(...result.value.showings);
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
    throw new Error(`Failed to fetch ${failedCinemas.length} KinoTicketsExpress cinemas: ${failedCinemas.join(", ")}`);
  }

  await markCinemasFetched(kinoTicketsExpressCinemas.map((c) => c.id));

  return { movies: allMovies, showings: allShowings };
};
