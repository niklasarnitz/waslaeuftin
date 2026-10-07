import { expect, test } from "bun:test";

import { compactCityProgramme } from "@waslaeuftin/helpers/compactCityProgramme";

const film = {
  name: "__proto__",
  coverUrl: null,
  tmdbMetadata: null,
  showings: [],
};

test("compact programmes remain serializable plain objects, including unusual movie names", () => {
  const data = compactCityProgramme({
    name: "Berlin",
    slug: "berlin",
    cinemas: [
      { id: 1, name: "Kino 1", slug: "kino1", movies: [film] },
      { id: 2, name: "Kino 2", slug: "kino2", movies: [film] },
    ],
  });
  expect(Object.getPrototypeOf(data.movieMetadata)).toBe(Object.prototype);
  expect(Object.keys(data.movieMetadata)).toEqual(["__proto__"]);
  expect(data.cinemas[0]?.movies[0]).not.toHaveProperty("tmdbMetadata");
  expect(JSON.parse(JSON.stringify(data)).cinemas).toHaveLength(2);
});
