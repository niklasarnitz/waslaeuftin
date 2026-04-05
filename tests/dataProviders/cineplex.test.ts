import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { expect, test } from "bun:test";

test('cineplex: Rundkino Dresden', async () => {
    try {
        const { movies, showings } = await getCineplexMovies([{ cineplexCinemaId: "Q2luZW1hOjIyNA==", cinemaId: -1 }]);

        console.info(`Got ${movies.length} movies with ${showings.length} showings for cineplex Rundkino Dresden`)

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0)
    } catch (error) {
        if (error instanceof Error && (error.message.includes('502') || error.message.includes('Unexpected token') || error.message.includes('Parse error') || error.message.includes('remaining connection slots'))) {
            console.warn(`Skipping cineplex test due to external API error (likely 502/Cloudflare protection or connection slots): ${error.message}`);
        } else {
            throw error;
        }
    }
}, { timeout: 20000 })
