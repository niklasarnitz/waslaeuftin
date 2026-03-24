import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { expect, test } from "bun:test";

test('cineplex: Rundkino Dresden', async () => {
    const { movies, showings } = await getCineplexMovies([{ cineplexCinemaId: "Q2luZW1hOjIyNA==", cinemaId: -1 }]);

    console.info(`Got ${movies.length} movies with ${showings.length} showings for cineplex Rundkino Dresden`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
}, { timeout: 15000 })
