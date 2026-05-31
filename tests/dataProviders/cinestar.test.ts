import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { expect, test } from "bun:test";

test('cinestar: Cinestar Augsburg', async () => {
    try {
        const { movies, showings } = await getCineStarMovies(-1, 1);

        console.info(`Got ${movies.length} movies with ${showings.length} showings for cinestar Augsburg`)

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0)
    } catch (error) {
        if (error instanceof Error && (error.message.includes('ConnectionRefused') || error.message.includes('403') || error.message.includes('fetch failed'))) {
            console.warn(`Skipping cinestar test due to external API blocking: ${error.message}`);
        } else {
            throw error;
        }
    }
}, { timeout: 30000 })
