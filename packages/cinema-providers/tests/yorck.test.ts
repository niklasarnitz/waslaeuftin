/* eslint-disable @typescript-eslint/no-non-null-assertion -- Known fixture shapes. */
/* eslint-disable @typescript-eslint/require-await -- Injectable async transport doubles. */
/* eslint-disable @typescript-eslint/await-thenable -- Bun rejection matchers are async. */
import { expect, test } from "bun:test";

import type { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";
import { getYorckMovies } from "@waslaeuftin/cinema-providers/internal/providers/yorck/getYorckMovies";

// eslint-disable-next-line no-restricted-imports -- Test-only fixture, not a package API.
import { yorckFixture } from "./fixtures/yorck";

const config = { vistaId: "1001", slug: "delphi-lux" };
const html = (props: unknown) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script>`;
const client = (fixture = yorckFixture()) => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const request: typeof fetchTextWithBun = async (url, headers, method) => {
    expect(method ?? "GET").toBe("GET");
    calls.push({ url, headers });
    if (url.includes("/OData.svc/Sessions?"))
      return { status: 200, body: JSON.stringify(fixture.api) };
    if (url === "https://www.yorck.de/kinos/delphi-lux")
      return { status: 200, body: html(fixture.venue) };
    if (url === "https://www.yorck.de/specials/filmreihe-2030")
      return { status: 200, body: html(fixture.special) };
    const detail = fixture.details.find(
      (entry) => url === `https://www.yorck.de/filme/${entry.film.fields.slug}`,
    );
    if (!detail) throw new Error(`Unexpected URL: ${url}`);
    return { status: 200, body: html(detail) };
  };
  return { request, calls };
};

test("native IDs win identity conflicts, preserve same-title films, filter venues and dedupe specials", async () => {
  const fixture = yorckFixture();
  fixture.api.value.push(fixture.api.value[0]!);
  const { request, calls } = client(fixture);
  const catalog = await getYorckMovies(42, config, request);
  expect(catalog.provider).toBe("Yorck");
  expect(catalog.fetchedCinemaIds).toEqual([42]);
  expect(catalog.movies.map((movie) => movie.providerFilmId)).toEqual([
    "HO00005613",
    "HO00009999",
  ]);
  expect(catalog.movies.map((movie) => movie.name)).toEqual([
    "Der Astronaut",
    "Der Astronaut",
  ]);
  expect(catalog.showings).toHaveLength(2);
  const show = catalog.showings[0]!;
  expect(show.cinemaId).toBe(42);
  expect(show.providerSessionId).toBe("1001-87842");
  expect(show.providerFilmId).toBe("HO00005613");
  expect(show.movieName).not.toBe("Kanal");
  expect(show.bookingUrl).toBe(
    "https://www.yorck.de/en/checkout/seats?sessionid=1001-87842",
  );
  expect(show.showingAdditionalData).toEqual(["B", "OmeU", "OmU"]);
  expect(show.showingAdditionalData).not.toContain("Englisch");
  expect(show.evidence).toEqual({
    tmdbId: 100,
    originalTitle: "Project Hail Mary",
    director: "Fixture Director",
    productionYear: 2026,
    runtimeMinutes: 120,
  });
  expect(catalog.movies[0]!.sourceMetadata).toMatchObject({
    tmdbId: 100,
    originalLanguage: "Englisch",
    about: "<p>Synopsis</p>",
    sourceUrl: "https://www.yorck.de/filme/der-astronaut",
  });
  expect(show.sourceMetadata).toMatchObject({
    ScreenName: "B",
    ScreenNumber: 2,
    SeatsAvailable: 0,
    AllowTicketSales: false,
    SoldoutStatus: 0,
    FormatCode: "0000000006",
    SessionAttributesNames: ["OmeU"],
    formats: ["OmeU", "OmU"],
  });
  expect(calls).toHaveLength(4);
  const apiCall = calls.find((call) => call.url.includes("OData.svc"))!;
  expect(apiCall.headers).toEqual({
    Accept: "application/json",
    "Content-Type": "application/json",
    Origin: "https://www.yorck.de",
  });
  expect(new URL(apiCall.url).searchParams.get("$filter")).toContain(
    "CinemaId eq '1001' and Showtime gt DATETIME'",
  );
});

test("special-only films are recovered by exact session and detail ID, not event/assigned title", async () => {
  const fixture = yorckFixture();
  fixture.venue.filmsSpecials.shift();
  const { request, calls } = client(fixture);
  const catalog = await getYorckMovies(42, config, request);
  expect(catalog.movies[0]!.providerFilmId).toBe("HO00005613");
  expect(catalog.movies[0]!.name).toBe("Der Astronaut");
  expect(catalog.showings[0]!.providerSessionId).toBe("1001-87842");
  expect(
    calls.filter((call) => call.url.endsWith("/der-astronaut")),
  ).toHaveLength(1);
});

test("a special session never authorizes a different movie ID", async () => {
  const fixture = yorckFixture();
  fixture.venue.filmsSpecials.shift();
  fixture.api.value[0]!.ScheduledFilmId = "HO00000000";
  await expect(
    getYorckMovies(42, config, client(fixture).request),
  ).rejects.toThrow("identity conflict");
});

test("cold Next.js fallback pages are read again, never accepted as movie data", async () => {
  const base = client();
  let coldReads = 3;
  const request: typeof fetchTextWithBun = async (url, headers) => {
    if (coldReads > 0 && url.endsWith("/der-astronaut")) {
      coldReads--;
      return {
        status: 200,
        body: '<script id="__NEXT_DATA__">{"isFallback":true,"props":{"pageProps":{}}}</script>',
      };
    }
    return base.request(url, headers);
  };
  expect((await getYorckMovies(42, config, request)).movies).toHaveLength(2);
}, 10_000);

test("uses winter/summer offsets, not the host timezone", async () => {
  const { request } = client();
  const catalog = await getYorckMovies(42, config, request);
  expect(catalog.showings.map((show) => show.dateTime.toISOString())).toEqual([
    "2026-12-04T17:00:00.000Z",
    "2026-07-04T18:00:00.000Z",
  ]);
});

test.each([
  [
    "2026-10-25T02:30:00",
    "2026-10-25T02:30:00+01:00",
    "2026-10-25T01:30:00.000Z",
  ],
  [
    "2026-10-25T02:30:00",
    "2026-10-25T02:30:00+02:00",
    "2026-10-25T00:30:00.000Z",
  ],
  [
    "2026-07-04T20:00:00",
    "2026-07-04T18:00:00.000Z",
    "2026-07-04T18:00:00.000Z",
  ],
])(
  "CMS instant cross-checks Berlin wall time including repeated hours: %s %s",
  async (local, zoned, expected) => {
    const fixture = yorckFixture();
    fixture.api.value[1]!.Showtime = local;
    fixture.venue.filmsSpecials[1]!.fields.sessions[0]!.fields.startTime =
      zoned;
    const catalog = await getYorckMovies(42, config, client(fixture).request);
    expect(catalog.showings[1]!.dateTime.toISOString()).toBe(expected);
  },
);

test("API-only sessions use Berlin dates when the native movie ID is known", async () => {
  const fixture = yorckFixture();
  fixture.venue.filmsSpecials[1]!.fields.sessions = [];
  const catalog = await getYorckMovies(42, config, client(fixture).request);
  expect(catalog.showings[1]!.dateTime.toISOString()).toBe(
    "2026-07-04T18:00:00.000Z",
  );
});

test.each([
  ["2026-03-29T02:30:00", "2026-03-29T02:30:00+01:00"],
  ["2026-07-04T20:00:00", "2026-07-04T20:00:00+01:00"],
  ["2026-07-04T20:00:00", "2026-07-04T21:00:00+02:00"],
  ["not a date", "2026-07-04T20:00:00+02:00"],
  ["2026-07-04T20:00:00", "2026-07-04T20:00:00"],
])(
  "rejects invalid or contradictory date evidence %s / %s",
  async (local, zoned) => {
    const fixture = yorckFixture();
    fixture.api.value[1]!.Showtime = local;
    fixture.venue.filmsSpecials[1]!.fields.sessions[0]!.fields.startTime =
      zoned;
    await expect(
      getYorckMovies(42, config, client(fixture).request),
    ).rejects.toThrow("Yorck:");
  },
);

test("rejects an ambiguous API-only autumn timestamp", async () => {
  const fixture = yorckFixture();
  fixture.api.value[1]!.Showtime = "2026-10-25T02:30:00";
  fixture.venue.filmsSpecials[1]!.fields.sessions = [];
  await expect(
    getYorckMovies(42, config, client(fixture).request),
  ).rejects.toThrow("ambiguous");
});

test.each([
  "unknown movie",
  "conflicting film",
  "conflicting session",
  "wrong detail",
  "wrong venue",
  "empty",
  "wrong namespace",
])("fails safely on %s", async (scenario) => {
  const fixture = yorckFixture();
  switch (scenario) {
    case "unknown movie":
      fixture.api.value[0]!.ScheduledFilmId = "HO00000000";
      break;
    case "conflicting film":
      fixture.api.value[0]!.ScheduledFilmId = "HO00009999";
      break;
    case "conflicting session":
      fixture.api.value.push({
        ...fixture.api.value[0]!,
        ScreenName: "Different",
      });
      break;
    case "wrong detail":
      fixture.details[0]!.film.sys.id = "HO00009999";
      break;
    case "wrong venue":
      fixture.venue.cinema.fields.vistaId = "1002";
      break;
    case "empty":
      fixture.api.value = [];
      break;
    case "wrong namespace":
      fixture.api.value[0]!.ID = "1002-87842";
      break;
  }
  await expect(
    getYorckMovies(42, config, client(fixture).request),
  ).rejects.toThrow("Yorck:");
});

test("missing optional rich evidence is not fabricated", async () => {
  const fixture = yorckFixture();
  fixture.details[0]!.film.fields.originalTitle = "";
  fixture.details[0]!.film.fields.director = "";
  fixture.details[0]!.film.fields.year = 0;
  fixture.details[0]!.film.fields.runtime = 0;
  fixture.details[0]!.film.fields.tmdbId = 0;
  const listing = fixture.venue.filmsSpecials[0]!.fields;
  if ("runtime" in listing) listing.runtime = 0;
  fixture.api.value[0]!.ScreenName = "";
  const catalog = await getYorckMovies(42, config, client(fixture).request);
  expect(catalog.movies[0]!.evidence).toEqual({
    tmdbId: undefined,
    originalTitle: undefined,
    director: undefined,
    productionYear: undefined,
    runtimeMinutes: undefined,
  });
  expect(catalog.showings[0]!.showingAdditionalData).toEqual(["OmeU", "OmU"]);
});

test.each([
  "malformed SSR",
  "invalid JSON",
  "missing sessions",
  "pagination",
  "HTTP failure",
])("rejects %s rather than stamping freshness", async (scenario) => {
  const base = client();
  const request: typeof fetchTextWithBun = async (url, headers) => {
    const response = await base.request(url, headers);
    if (url.includes("OData.svc")) {
      if (scenario === "invalid JSON") response.body = "{";
      if (scenario === "missing sessions") response.body = "{}";
      if (scenario === "pagination")
        response.body = JSON.stringify({
          ...yorckFixture().api,
          "odata.nextLink": "next",
        });
      if (scenario === "HTTP failure") response.status = 500;
    } else if (scenario === "malformed SSR")
      response.body = "<html>Unavailable</html>";
    return response;
  };
  await expect(getYorckMovies(42, config, request)).rejects.toThrow();
});
