/* eslint-disable @typescript-eslint/no-non-null-assertion -- Known fixture shapes. */
/* eslint-disable @typescript-eslint/require-await -- Injectable HTTP test doubles. */
/* eslint-disable @typescript-eslint/await-thenable -- Bun promise matchers. */
import { expect, test } from "bun:test";

import type { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";
import { getCinetixxMovies } from "@waslaeuftin/cinema-providers/internal/providers/cinetixx/getCinetixxMovies";

interface FixtureEvent {
  id: number;
  movieId?: number;
  movieName: string;
  title: string;
  shows: Record<string, unknown>[];
  [key: string]: unknown;
}
const fixture = async () =>
  JSON.parse(
    await Bun.file(`${import.meta.dir}/fixtures/cinetixx-events.json`).text(),
  ) as FixtureEvent[];
const requestFor =
  (data: unknown): typeof fetchTextWithBun =>
  async () => ({
    status: 200,
    body: JSON.stringify(data),
  });
const catalogFor = (data: unknown, providerCinemaId = "301802645") =>
  getCinetixxMovies(42, providerCinemaId, requestFor(data));

test("anonymous programme request retains asymmetric native IDs and raw metadata", async () => {
  const data = await fixture();
  const calls: string[] = [];
  const result = await getCinetixxMovies(
    42,
    "301802645",
    async (url, headers, method) => {
      calls.push(url);
      expect(headers).toEqual({ Accept: "application/json" });
      expect(method).toBeUndefined();
      return { status: 200, body: JSON.stringify(data) };
    },
  );
  expect(calls).toEqual([
    "https://booking.cinetixx.de/api/cinemas/events/cinema/301802645",
  ]);
  expect(result.provider).toBe("Cinetixx");
  expect(result.movies).toHaveLength(1);
  expect(result.showings).toHaveLength(1);
  const movie = result.movies[0]!;
  const show = result.showings[0]!;
  expect(movie.providerFilmId).toBe("movie:3633765975");
  expect(show.providerFilmId).toBe(movie.providerFilmId);
  expect(show.providerSessionId).toBe("3695012261");
  expect(show.cinemaId).toBe(42);
  expect(show.bookingUrl).toBe(data[0]!.shows[0]!._UrlBooking as string);
  expect(show.sourceMetadata).toMatchObject({
    cinemaId: 301802645,
    eventId: 3661117488,
    movieId: 3633765975,
    auditoriumId: 301805136,
    timeZone: "Europe/Berlin",
    xrefReleaseNoNamespace: "unverified",
    film: {
      xrefReleaseNo: "2155353",
      actors: "Actor One, Actor Two",
      country: "DE",
    },
    show: {
      canSale: true,
      flagNotForSale: false,
      endCancelation: "2026-11-03T16:15:00",
      endSale: "2026-11-03T20:15:00",
      endReservation: "2026-11-03T19:15:00",
      notForSaleInformation: "Kein Online-Kauf möglich.",
    },
  });
  expect(movie.evidence).toEqual({
    director: "Bora Dagtekin",
    runtimeMinutes: 125,
  });
  expect(movie.sourceMetadata).toMatchObject({
    film: { premiereDate: "2026-11-03T17:45:00" },
  });
  expect(show.showingAdditionalData).toEqual([
    "Kino 2",
    "OmU",
    "OmU, Englisch",
    "3D",
  ]);
  expect(show.showingAdditionalData).not.toContain("Kein Online-Kauf möglich.");
  expect(show.dateTime.toISOString()).toBe("2026-11-03T19:15:00.000Z");
});

test("scope is the returned cinema identity, not room/event/movie identity", async () => {
  const result = await catalogFor(await fixture(), "210767353");
  expect(result.showings).toHaveLength(1);
  expect(result.showings[0]!.providerSessionId).toBe("3695012299");
  expect(result.showings[0]!.showingAdditionalData).toContain("Saal 2");
});

test("deduplicates native sessions and repeated events, rejecting conflicting duplicate IDs", async () => {
  const data = await fixture();
  data[0]!.shows.push(structuredClone(data[0]!.shows[0]!));
  data.push(structuredClone(data[0]!));
  const result = await catalogFor(data);
  expect(result.showings).toHaveLength(1);
  expect(result.movies).toHaveLength(1);
  data[1]!.shows[0]!.displayDateTime = "2026-11-03T21:15:00";
  await expect(catalogFor(data)).rejects.toThrow("conflicting duplicate");
});

test("movie/event namespaces do not collide and same-title films stay distinct", async () => {
  const data = await fixture();
  const second = structuredClone(data[0]!);
  second.id = second.movieId!;
  delete second.movieId;
  second.shows = [
    {
      ...second.shows[0]!,
      id: 555,
      eventId: second.id,
      _UrlBooking: undefined,
    },
  ];
  data.push(second);
  const result = await catalogFor(data);
  expect(result.movies.map((movie) => movie.providerFilmId)).toEqual([
    "movie:3633765975",
    "event:3633765975",
  ]);
});

test("naive Berlin winter/summer times do not depend on the host timezone", async () => {
  const data = await fixture();
  for (const [local, instant] of [
    ["2026-01-06T00:15:00", "2026-01-05T23:15:00.000Z"],
    ["2026-07-06T20:15:00", "2026-07-06T18:15:00.000Z"],
    ["2026-03-29T03:15:00", "2026-03-29T01:15:00.000Z"],
    ["2026-10-25T03:15:00", "2026-10-25T02:15:00.000Z"],
  ] as const) {
    data[0]!.shows[0]!.displayDateTime = local;
    expect((await catalogFor(data)).showings[0]!.dateTime.toISOString()).toBe(
      instant,
    );
  }
});

test("rejects calendar rollovers, DST gaps/folds and unexpected time formats", async () => {
  const data = await fixture();
  for (const date of [
    "2026-02-30T20:00:00",
    "2026-03-29T02:30:00",
    "2026-10-25T02:30:00",
    "2026-11-03T24:00:00",
    "2026-11-03T20:15:00Z",
    "not a date",
    null,
  ]) {
    data[0]!.shows[0]!.displayDateTime = date;
    await expect(catalogFor(data)).rejects.toThrow();
  }
});

test("preserves language/version labels without inferring subtitle language or accessibility", async () => {
  const data = await fixture();
  for (const version of ["OV", "OmU", "OmeU", "ital. OmeU", "D & AD"]) {
    data[0]!.versionType = version;
    data[0]!.language = `${version}, Originalversion`;
    data[0]!.shows[0]!.language = "Japanese";
    const show = (await catalogFor(data)).showings[0]!;
    expect(show.showingAdditionalData).toContain(version);
    expect(show.showingAdditionalData).toContain("Japanese");
    expect(show.sourceMetadata).toMatchObject({
      film: { language: `${version}, Originalversion` },
    });
  }
});

test("non-sellable sessions remain scheduled without inventing sold-out or cancellation states", async () => {
  const data = await fixture();
  Object.assign(data[0]!.shows[0]!, {
    canSale: false,
    canReservation: false,
    booking: false,
    flagNotForSale: true,
  });
  const result = await catalogFor(data);
  expect(result.showings).toHaveLength(1);
  expect(result.showings[0]!.sourceMetadata).toMatchObject({
    show: { canSale: false, flagNotForSale: true },
  });
  expect(result.showings[0]!.showingAdditionalData).not.toContain("sold out");
});

test("empty, malformed, unscoped and partially malformed responses throw rather than clear schedules", async () => {
  for (const data of [null, {}, [], [null], [{ id: 1, movieName: "Film" }]])
    await expect(catalogFor(data)).rejects.toThrow();
  const data = await fixture();
  await expect(catalogFor(data, "999")).rejects.toThrow("no scoped shows");
  data[0]!.shows = [];
  await expect(catalogFor(data)).rejects.toThrow("no scoped shows");
  data.push({ id: 3, movieName: "", title: "", shows: [] });
  await expect(catalogFor(data)).rejects.toThrow();
  await expect(
    getCinetixxMovies(42, "301802645", async () => ({
      status: 200,
      body: "not json",
    })),
  ).rejects.toThrow();
  await expect(
    getCinetixxMovies(42, "301802645", async () => ({
      status: 503,
      body: "unavailable",
    })),
  ).rejects.toThrow("503");
  await expect(catalogFor(await fixture(), "../301802645")).rejects.toThrow(
    "native ID",
  );
});

test("rejects asymmetric event and booking identities instead of silently attaching wrong shows", async () => {
  for (const patch of [
    { eventId: 42 },
    { id: 0 },
    { canSale: "true" },
    {
      _UrlBooking:
        "https://booking.cinetixx.de/frontend/index.html?cinemaId=301802645&showId=42",
    },
    {
      _UrlBooking:
        "https://booking.cinetixx.de/frontend/index.html?cinemaId=210767353&showId=3695012261",
    },
    {
      _UrlBooking:
        "https://example.com/frontend/index.html?cinemaId=301802645&showId=3695012261",
    },
  ]) {
    const data = await fixture();
    Object.assign(data[0]!.shows[0]!, patch);
    await expect(catalogFor(data)).rejects.toThrow();
  }
});
