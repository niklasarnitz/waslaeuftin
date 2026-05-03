import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { expect, test } from "bun:test";

test('cinestar: Cinestar Augsburg', async () => {
    const { movies, showings } = await getCineStarMovies(-1, 1);

    console.info(`Got ${movies.length} movies with ${showings.length} showings for cinestar Augsburg`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
}, { timeout: 30000 })
