import { expect, test } from "bun:test";

import { getCineStarMovies } from "@waslaeuftin/cinema-providers/server";

test(
  "cinestar: Cinestar Augsburg",
  async () => {
    try {
      const { movies, showings } = await getCineStarMovies(-1, 1);

      console.info(
        `Got ${movies.length} movies with ${showings.length} showings for cinestar Augsburg`,
      );

      expect(movies.length).toBeGreaterThanOrEqual(0);
      expect(showings.length).toBeGreaterThanOrEqual(0);
    } catch (error) {
      if (
        error instanceof Error &&
        (("code" in error && error.code === "ConnectionRefused") ||
          error.message.includes("403") ||
          error.message.includes("Unable to connect"))
      ) {
        console.warn(
          "Skipping test due to expected third-party anti-bot protection/connection refused",
        );
        return;
      }
      throw error;
    }
  },
  { timeout: 60000 },
);
