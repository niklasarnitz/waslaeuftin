import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { expect, test } from "bun:test";

test('premiumkino: Zoopalast Berlin', async () => {
    const { movies, showings } = await getPremiumKinoMovies(-1, "zoopalast");

    console.info(`Got ${movies.length} movies with ${showings.length} showings for Zoopalast Berlin`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
}, { timeout: 20000 })
