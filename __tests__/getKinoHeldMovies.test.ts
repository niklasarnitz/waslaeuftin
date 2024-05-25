import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { expect, test } from "bun:test";
import moment from "moment-timezone";

test("Correctly fetches movies for kinoheld cinema", async () => {
  const movies = await getKinoHeldMovies(13, {
    centerId: "1865",
    centerShorty: "traumpalast-leonberg",
    id: 3,
    createdAt: moment("2024-03-29 22:02:39.296").toDate(),
    updatedAt: moment("2024-03-29 22:02:39.296").toDate(),
  });

  console.log(movies);

  expect(movies).toBeDefined();
  expect(movies).toBeArray();
  expect(movies.length).toBeGreaterThan(0);
});
