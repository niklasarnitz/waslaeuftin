import { getKinoTicketsExpressMovies } from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";
import { expect, test } from "bun:test";

const testCinema = async (slug: string) => {
    const { movies, showings } = await getKinoTicketsExpressMovies(-1, slug);

    console.info(`Got ${movies.length} movies with ${showings.length} showings for ${slug}`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
}

test("kino tickets express: Schauburg Karlsruhe", async () => {
    await testCinema('karlsruhe_schauburg');
});

test("kino tickets express: Kinemathek Karlsruhe", async () => {
    await testCinema('karlsruhe_kinemathek');
});
