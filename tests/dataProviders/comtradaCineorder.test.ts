import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { expect, test } from "bun:test";

test('comtrada cineorder: Filmpalast am ZKM', async () => {
    try {
        const { movies, showings } = await getComtradaCineOrderMovies(-1, {
            backendUrl: "https://ts.kinopolis.de",
            centerShorty: "ka",
            centerId: "19210000014PLXMQDD",
            createdAt: new Date(),
            updatedAt: new Date(),
            id: -2
        });

        console.info(`Got ${movies.length} movies with ${showings.length} showings for Filmpalast am ZKM`)

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0)
    } catch (error) {
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('Forbidden') || error.message.includes('Automated access detected'))) {
            console.warn(`Skipping comtrada cineorder test due to external API anti-bot protection: ${error.message}`);
        } else {
            throw error;
        }
    }
}, { timeout: 40000 })

test('comtrada cineorder: Forum Rastatt', async () => {
    try {
        const { movies, showings } = await getComtradaCineOrderMovies(-1, {
            backendUrl: "https://cineorder.forumcinemas.de",
            centerShorty: "fra",
            centerId: "90000000014EXQRDFE",
            createdAt: new Date(),
            updatedAt: new Date(),
            id: -2
        });

        console.info(`Got ${movies.length} movies with ${showings.length} showings for Forum Rastatt`)

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0)
    } catch (error) {
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('Forbidden') || error.message.includes('Automated access detected'))) {
            console.warn(`Skipping comtrada cineorder test due to external API anti-bot protection: ${error.message}`);
        } else {
            throw error;
        }
    }
}, { timeout: 20000 })
