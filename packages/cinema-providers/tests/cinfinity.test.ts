import { expect, test } from "bun:test";

import {
  getCinfinityCinemas,
  getCinfinityMovies,
} from "@waslaeuftin/cinema-providers/server";

test(
  "cinfinity: fetches cinemas",
  async () => {
    const cinemas = await getCinfinityCinemas();

    expect(cinemas.length).toBeGreaterThan(0);
    expect(cinemas.some((cinema) => cinema.id === "Q2luZW1hOjMxOA==")).toBe(
      true,
    );
  },
  { timeout: 20000 },
);

test(
  "cinfinity: Kinopark Aalen",
  async () => {
    const { movies, showings } = await getCinfinityMovies([
      {
        cinemaId: -1,
        cinfinityCinemaId: "Q2luZW1hOjMxOA==",
      },
    ]);

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
    expect(showings.every((showing) => showing.cinemaId === -1)).toBe(true);
  },
  { timeout: 20000 },
);
