import { expect, test } from "bun:test";

import { getKinoHeldMovies } from "@waslaeuftin/cinema-providers/server";

test(
  "kinoheld: Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-leonberg",
      centerId: "MjI2MDM4MA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);

test(
  "kinoheld: IMAX Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-imax-leonberg",
      centerId: "Mzg0MDgyOA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for IMAX Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);
