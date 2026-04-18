import {
    getKinoTicketsExpressMovies,
    parseKinoTicketsExpressDateTime,
} from "@waslaeuftin/cinemaProviders/kino-ticket-express/getKinoTicketExpressMovies";
import { expect, test } from "bun:test";

const testCinema = async (slug: string) => {
    const { movies, showings } = await getKinoTicketsExpressMovies(-1, slug);

    console.info(`Got ${movies.length} movies with ${showings.length} showings for ${slug}`)

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0)
}

test("kino tickets express: Schauburg Karlsruhe", async () => {
    await testCinema('karlsruhe_schauburg');
}, { timeout: 20000 });

test("kino tickets express: Kinemathek Karlsruhe", async () => {
    await testCinema('karlsruhe_kinemathek');
}, { timeout: 20000 });

test("kino tickets express: parses provider-local times in Europe/Berlin", () => {
    const parsed = parseKinoTicketsExpressDateTime(
        "2026-04-18 19:00",
        "YYYY-MM-DD HH:mm",
    );

    expect(parsed.toISOString()).toBe("2026-04-18T17:00:00.000Z");
});
