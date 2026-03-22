import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { getKinoHeldCinemas } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldCinemas";
import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { expect, test } from "bun:test";

test('premiumkino: Astor Film Lounge', async () => {
    const { movies, showings } = await getPremiumKinoMovies(-1, "berlin");

    console.info(`Got ${movies.length} movies with ${showings.length} showings for Astor Film Lounge`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
})
