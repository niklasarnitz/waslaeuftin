/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test fixtures have known shapes. */
/* eslint-disable @typescript-eslint/require-await -- Async HTTP test doubles. */
/* eslint-disable @typescript-eslint/await-thenable -- Bun async matchers must be awaited. */
import { expect, test } from "bun:test";

import type { RawResponse } from "@waslaeuftin/cinema-providers/internal/fetchText";
import type { CinemaxxVueFilm } from "@waslaeuftin/cinema-providers/internal/providers/cinemaxx-vue/getCinemaxxVueMovies";
import {
  createCinemaxxVueClient,
  parseCinemaxxVueFilms,
} from "@waslaeuftin/cinema-providers/internal/providers/cinemaxx-vue/getCinemaxxVueMovies";

const fixture = (): CinemaxxVueFilm[] => [
  {
    filmTitle: "Film",
    filmAttributes: [{ name: "Preview" }],
    showingGroups: [
      {
        sessions: [
          {
            sessionId: "27874",
            showTimeWithTimeZone: "2026-12-16T00:01:00+01:00",
            bookingUrl: "/buchtickets/zusammenfassung/1931/HO00001610/27874",
            screenName: "Kino 01",
            attributes: [{ name: "OV" }, { name: "3D" }, { name: "OV" }],
          },
        ],
      },
    ],
  },
];
const response = (result: unknown): RawResponse => ({
  status: 200,
  body: JSON.stringify({ result }),
});

test("direct sessions use zoned time, booking URL, and distinct attributes", () => {
  const films = fixture();
  films[0]!.showingGroups.push(films[0]!.showingGroups[0]!);
  const catalog = parseCinemaxxVueFilms(1490, 1931, films);
  expect(catalog.movies).toEqual([{ cinemaId: 1490, name: "Film" }]);
  expect(catalog.showings).toHaveLength(1);
  expect(catalog.showings[0]).toEqual({
    cinemaId: 1490,
    movieName: "Film",
    dateTime: new Date("2026-12-15T23:01:00Z"),
    bookingUrl:
      "https://www.cinemaxx.de/buchtickets/zusammenfassung/1931/HO00001610/27874",
    showingAdditionalData: ["Kino 01", "OV", "3D", "Preview"],
  });
});

test("summer time is independent of the host timezone", () => {
  const films = fixture();
  films[0]!.showingGroups[0]!.sessions[0]!.showTimeWithTimeZone =
    "2026-07-06T20:00:00+02:00";
  expect(
    parseCinemaxxVueFilms(
      1490,
      1931,
      films,
    ).showings[0]!.dateTime.toISOString(),
  ).toBe("2026-07-06T18:00:00.000Z");
});

test("rejects missing timezone and booking links for other cinemas", () => {
  const films = fixture();
  const session = films[0]!.showingGroups[0]!.sessions[0]!;
  session.showTimeWithTimeZone = "2026-12-16T00:01:00";
  expect(() => parseCinemaxxVueFilms(1490, 1931, films)).toThrow(
    "invalid zoned time",
  );
  session.showTimeWithTimeZone += "+01:00";
  session.bookingUrl = "/buchtickets/zusammenfassung/1107/HO00001610/27874";
  expect(() => parseCinemaxxVueFilms(1490, 1931, films)).toThrow(
    "wrong cinema",
  );
});

test("refreshes schedules instead of caching them and reuses guest cookies", async () => {
  let auths = 0;
  let requests = 0;
  const client = createCinemaxxVueClient(async (url, headers, method) => {
    if (url.endsWith("/auth/token")) {
      expect(method).toBe("POST");
      auths++;
      return { ...response({}), cookies: ["guest=test; HttpOnly; Path=/"] };
    }
    expect(headers.Cookie).toBe("guest=test");
    requests++;
    const films = fixture();
    films[0]!.filmTitle = `Film ${requests}`;
    return response(films);
  });
  expect((await client.getMovies(1490, 1931)).movies[0]!.name).toBe("Film 1");
  expect((await client.getMovies(1490, 1931)).movies[0]!.name).toBe("Film 2");
  expect(auths).toBe(1);
  expect(requests).toBe(2);
});

test("renews expired guest authentication once", async () => {
  let auths = 0;
  let attempts = 0;
  const client = createCinemaxxVueClient(async (url) => {
    if (url.endsWith("/auth/token"))
      return { ...response({}), cookies: [`guest=${++auths}`] };
    return ++attempts === 1 ? { status: 401, body: "" } : response(fixture());
  });
  expect((await client.getMovies(1490, 1931)).showings).toHaveLength(1);
  expect(auths).toBe(2);
});

test("fails closed on provider errors, malformed data, and unavailable guest cookies", async () => {
  for (const body of [
    "<html>upstream error</html>",
    JSON.stringify({ result: null, errorMessage: "Unavailable" }),
  ]) {
    const client = createCinemaxxVueClient(async () => ({ status: 200, body }));
    await expect(client.getCinemas()).rejects.toThrow();
  }
  const client = createCinemaxxVueClient(async () => response({}));
  await expect(client.getMovies(1490, 1931)).rejects.toThrow("no cookies");
});

test("recovers a missing API title from the official film page", async () => {
  const client = createCinemaxxVueClient(async (url) => {
    if (url.endsWith("/auth/token"))
      return { ...response({}), cookies: ["guest=test"] };
    if (url.endsWith("/film/robu-404"))
      return { status: 200, body: "<title>Robu 404 | CinemaxX</title>" };
    const films = fixture();
    films[0]!.filmTitle = "";
    films[0]!.filmUrl = "https://www.cinemaxx.de/film/robu-404";
    return response(films);
  });
  expect((await client.getMovies(1490, 1931)).movies[0]!.name).toBe("Robu 404");
});
