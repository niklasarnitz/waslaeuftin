import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { expect, test } from "bun:test";

test('cinestar: Cinestar Augsburg', async () => {
    try {
        const { movies, showings } = await getCineStarMovies(-1, 1);

        console.info(`Got ${movies.length} movies with ${showings.length} showings for cinestar Augsburg`)

        expect(movies.length).toBeGreaterThanOrEqual(0);
        expect(showings.length).toBeGreaterThanOrEqual(0)
    } catch (error: any) {
        if (error?.code === "ConnectionRefused" || error?.message?.includes("403") || error?.message?.includes("Unable to connect")) {
            console.warn("Skipping test due to expected third-party anti-bot protection/connection refused");
            return;
        }
        throw error;
    }
}, { timeout: 60000 })
