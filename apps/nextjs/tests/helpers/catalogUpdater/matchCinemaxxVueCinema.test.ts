import { expect, test } from "bun:test";

import { matchCinemaxxVueCinema } from "@waslaeuftin/helpers/catalogUpdater/matchCinemaxxVueCinema";

const directory = [
  {
    cinemaId: "1931",
    cinemaName: "Regensburg",
    fullName: "CinemaxX Regensburg",
  },
  {
    cinemaId: "1206",
    cinemaName: "Hamburg-Dammtor",
    fullName: "CinemaxX Hamburg-Dammtor",
  },
  {
    cinemaId: "1207",
    cinemaName: "Hamburg-Harburg",
    fullName: "CinemaxX Hamburg-Harburg",
  },
  { cinemaId: "1477", cinemaName: "Krefeld", fullName: "CinemaxX Krefeld" },
  { cinemaId: "1971", cinemaName: "Würzburg", fullName: "CinemaxX Würzburg" },
];
test("matches Regensburg and retains the exact Hamburg venue", () => {
  expect(
    matchCinemaxxVueCinema(
      { name: "CinemaxX Regensburg", city: { name: "Regensburg" } },
      directory,
    ),
  ).toBe(1931);
  expect(
    matchCinemaxxVueCinema(
      { name: "CinemaxX Hamburg - Dammtor", city: { name: "Hamburg" } },
      directory,
    ),
  ).toBe(1206);
});
test("matches known Kinoheld location aliases and the bare Würzburg name", () => {
  expect(
    matchCinemaxxVueCinema(
      {
        name: "CinemaxX Dießem, Lehmheide",
        city: { name: "Dießem, Lehmheide" },
      },
      directory,
    ),
  ).toBe(1477);
  expect(
    matchCinemaxxVueCinema(
      { name: "CinemaxX", city: { name: "Würzburg" } },
      directory,
    ),
  ).toBe(1971);
});
test("does not guess a cinema from an ambiguous city or overwrite unrelated cinemas", () => {
  expect(() =>
    matchCinemaxxVueCinema(
      { name: "CinemaxX", city: { name: "Hamburg" } },
      directory,
    ),
  ).toThrow();
  expect(() =>
    matchCinemaxxVueCinema(
      { name: "Other Cinema", city: { name: "Regensburg" } },
      directory,
    ),
  ).toThrow();
  expect(() =>
    matchCinemaxxVueCinema(
      { name: "CinemaxX Regensburg", city: { name: "Regensburg" } },
      [...directory, directory[0]!],
    ),
  ).toThrow();
});
