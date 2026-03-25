import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { ProviderCatalog } from "@waslaeuftin/types/ProviderCatalog";

export const fetchPremiumKinoCatalog = async (): Promise<ProviderCatalog> => {
    const failedCinemas: string[] = [];
    const allMovies: ProviderCatalog["movies"] = [];
    const allShowings: ProviderCatalog["showings"] = [];

    const allPremiumKinoCinemas = await db.cinema.findMany({
        where: { premiumKinoSubdomain: { not: null } },
    });
    const premiumKinoCinemas = allPremiumKinoCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
    console.info(`[PremiumKino] Found ${premiumKinoCinemas.length} cinemas to fetch (${allPremiumKinoCinemas.length - premiumKinoCinemas.length} skipped, recently fetched)`);

    const cinemaChunks = chunkArray(premiumKinoCinemas, CINEMA_BATCH_SIZE);

    for (const [index, chunk] of cinemaChunks.entries()) {
        console.info(`[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
        const cinemaResults = await Promise.allSettled(
            chunk.map((cinema) => getPremiumKinoMovies(cinema.id, cinema.premiumKinoSubdomain!)),
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
        throw new Error(`Failed to fetch ${failedCinemas.length} PremiumKino cinemas: ${failedCinemas.join(", ")}`);
    }

    await markCinemasFetched(premiumKinoCinemas.map((c) => c.id));

    return { movies: allMovies, showings: allShowings };
};
