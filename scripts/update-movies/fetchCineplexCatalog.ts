import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { db } from "@waslaeuftin/server/db";
import { BATCH_DELAY_MS, chunkArray, CINEMA_BATCH_SIZE, isCinemaStale, markCinemasFetched, sleep } from "./helpers";
import { ProviderCatalog } from "@waslaeuftin/types/ProviderCatalog";

export const fetchCineplexCatalog = async (): Promise<ProviderCatalog> => {
    const allMovies: ProviderCatalog["movies"] = [];
    const allShowings: ProviderCatalog["showings"] = [];

    const allCineplexCinemas = await db.cinema.findMany({
        where: { cineplexCinemaId: { not: null } },
    });
    const cineplexCinemas = allCineplexCinemas.filter((c) => isCinemaStale(c.lastFetchedAt));
    console.info(`[Cineplex] Found ${cineplexCinemas.length} cinemas to fetch (${allCineplexCinemas.length - cineplexCinemas.length} skipped, recently fetched)`);

    const cinemaChunks = chunkArray(cineplexCinemas, CINEMA_BATCH_SIZE);

    for (const [index, chunk] of cinemaChunks.entries()) {
        console.info(`[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Fetching ${chunk.length} cinemas`);
        const { movies, showings } = await getCineplexMovies(
            chunk.map((cinema) => ({
                cinemaId: cinema.id,
                cineplexCinemaId: cinema.cineplexCinemaId!,
            })),
        );

        allMovies.push(...movies);
        allShowings.push(...showings);

        if (index < cinemaChunks.length - 1) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    await markCinemasFetched(cineplexCinemas.map((c) => c.id));

    return { movies: allMovies, showings: allShowings };
};
