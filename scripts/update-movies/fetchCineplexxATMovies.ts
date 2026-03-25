import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { getCineplexxATMovies } from "@waslaeuftin/cinemaProviders/cineplex-at/getCineplexxATMovies";
import { ProviderCatalog } from "@waslaeuftin/types/ProviderCatalog";

export const fetchCineplexxATCatalog = async (): Promise<ProviderCatalog> => {
    const failedCinemas: string[] = [];
    const allMovies: ProviderCatalog["movies"] = [];
    const allShowings: ProviderCatalog["showings"] = [];

    const allCineplexxAtCinemas = await db.cinema.findMany({
        where: { cineplexxAtCinemaId: { not: null } },
    });
    const cineplexxAtCinemas = allCineplexxAtCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
    console.info(`[CineplexxAT] Found ${cineplexxAtCinemas.length} cinemas to fetch (${allCineplexxAtCinemas.length - cineplexxAtCinemas.length} skipped, recently fetched)`);

    const cinemaChunks = chunkArray(cineplexxAtCinemas, CINEMA_BATCH_SIZE);

    for (const [index, chunk] of cinemaChunks.entries()) {
        console.info(`[CineplexxAT][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
        const cinemaResults = await Promise.allSettled(
            chunk.map((cinema) => getCineplexxATMovies(cinema.id, cinema.cineplexxAtCinemaId!)),
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
        throw new Error(`Failed to fetch ${failedCinemas.length} CineplexxAT cinemas: ${failedCinemas.join(", ")}`);
    }

    await markCinemasFetched(cineplexxAtCinemas.map((c) => c.id));

    return { movies: allMovies, showings: allShowings };
};
