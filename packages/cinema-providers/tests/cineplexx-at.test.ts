import { expect, test } from "bun:test";

import { getCineplexxATMovies } from "@waslaeuftin/cinema-providers/server";

test(
  "cineplexx-at: Apollo - Das Kino",
  async () => {
    const { movies, showings } = await getCineplexxATMovies(-1, "1001");
    const flattenedShowings = showings.flat();

    console.info(
      `Got ${movies.length} movies with ${flattenedShowings.length} showings for Apollo - Das Kino`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(flattenedShowings.length).toBeGreaterThan(0);
  },
  { timeout: 120000 },
);
