import { expect, mock, test } from "bun:test";

const cities = [
  { id: 1, name: "Aachen", slug: "aachen", latitude: 50.78, longitude: 6.08 },
  { id: 2, name: "Berlin", slug: "berlin", latitude: 52.52, longitude: 13.4 },
  {
    id: 3,
    name: "Unbekannt",
    slug: "unknown",
    latitude: null,
    longitude: null,
  },
];
const cinemas = [
  {
    id: 1,
    name: "A Kino",
    slug: "a",
    latitude: null,
    longitude: null,
    city: cities[0],
  },
  {
    id: 2,
    name: "B Kino",
    slug: "b",
    latitude: null,
    longitude: null,
    city: cities[1],
  },
  {
    id: 3,
    name: "C Kino",
    slug: "c",
    latitude: 52.521,
    longitude: 13.401,
    city: cities[0],
  },
  {
    id: 4,
    name: "D Kino",
    slug: "d",
    latitude: null,
    longitude: null,
    city: cities[2],
  },
];

await mock.module("@waslaeuftin/db/client", () => ({
  db: {
    city: { findMany: () => Promise.resolve([...cities]) },
    cinema: { findMany: () => Promise.resolve([...cinemas]) },
  },
}));
await mock.module("@waslaeuftin/api/internal/umami", () => ({
  getAnalyticsSource: () => "web",
  trackCityView: () => Promise.resolve(undefined),
}));
const { db } = await import("@waslaeuftin/db/client");
const { citiesRouter } =
  await import("@waslaeuftin/api/internal/router/cities");
const caller = citiesRouter.createCaller({ db, headers: new Headers() });

test("empty search returns the nearest cities and cinemas, including city coordinate fallback", async () => {
  const result = await caller.search({
    query: "",
    location: { latitude: 52.52, longitude: 13.4 },
  });
  expect(result.cities.map((city) => city.id)).toEqual([2, 1]);
  expect(result.cinemas.map((cinema) => cinema.id)).toEqual([2, 3, 1]);
  expect(result.movies).toEqual([]);
});

test("legacy searches without location remain alphabetical", async () => {
  const result = await caller.search("");
  expect(result.cities.map((city) => city.id)).toEqual([1, 2, 3]);
  expect(result.cinemas.map((cinema) => cinema.id)).toEqual([1, 2, 3, 4]);
});
