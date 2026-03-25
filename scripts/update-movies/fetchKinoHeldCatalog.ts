import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { ProviderCatalog } from "@waslaeuftin/types/ProviderCatalog";

export const fetchKinoHeldCatalog = async (): Promise<ProviderCatalog> => {
    const failedCinemas: string[] = [];
    const allMovies: ProviderCatalog["movies"] = [];
    const allShowings: ProviderCatalog["showings"] = [];

    const allKinoHeldCinemas = await db.cinema.findMany({
        where: { kinoHeldCinemasMetadata: { isNot: null } },
        include: { kinoHeldCinemasMetadata: true },
    });
    const kinoHeldCinemas = allKinoHeldCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
    console.info(`[KinoHeld] Found ${kinoHeldCinemas.length} cinemas to fetch (${allKinoHeldCinemas.length - kinoHeldCinemas.length} skipped, recently fetched)`);

    const cinemaChunks = chunkArray(kinoHeldCinemas, CINEMA_BATCH_SIZE);

    for (const [index, chunk] of cinemaChunks.entries()) {
        console.info(`[KinoHeld][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
        const cinemaResults = await Promise.allSettled(
            chunk.map((cinema) => getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!)),
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
        throw new Error(`Failed to fetch ${failedCinemas.length} KinoHeld cinemas: ${failedCinemas.join(", ")}`);
    }

    await markCinemasFetched(kinoHeldCinemas.map((c) => c.id));

    return { movies: allMovies, showings: allShowings };
};
