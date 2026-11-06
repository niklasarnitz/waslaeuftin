/* eslint-disable @typescript-eslint/require-await -- Injectable HTTP fixture transport. */
/* eslint-disable @typescript-eslint/await-thenable -- Bun promise matchers. */
import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";
import { load } from "cheerio";

import type { fetchTextWithBun } from "@waslaeuftin/cinema-providers/internal/fetchText";
import {
  getDieselKinoMovies,
  getMegaplexMovies,
  getStarMovieMovies,
} from "@waslaeuftin/cinema-providers/server";

// Reduced captures retain the original provider structures and IDs. Freeze the
// capture date so future/expired filtering and Heute/Morgen remain reproducible.
beforeEach(() => setSystemTime(new Date("2026-11-06T10:00:00Z")));
afterEach(() => setSystemTime());
const fixture = (name: string) =>
  Bun.file(`${import.meta.dir}/fixtures/${name}.html`).text();
const transport =
  (pages: Record<string, string>): typeof fetchTextWithBun =>
  async (url) => {
    const body = pages[new URL(url).pathname];
    if (body === undefined) throw new Error(`Unexpected fixture URL: ${url}`);
    return { status: 200, body };
  };
const diesel = (html: string) =>
  getDieselKinoMovies(
    42,
    "gleisdorf",
    transport({ "/programmuebersicht/": html }),
  );
const star = async (html?: string) =>
  getStarMovieMovies(
    43,
    "regau",
    transport({
      "/star-movie-regau/programm/": html ?? (await fixture("starmovie-regau")),
      "/star-movie-regau/programm/filme/minions-3-6736/": await fixture(
        "starmovie-regau-detail",
      ),
    }),
  );
const megaplex = async (slug: "linz" | "metropol", detail?: string) =>
  getMegaplexMovies(
    44,
    slug,
    transport({
      [`/kinoprogramm/${slug}`]: await fixture(`megaplex-${slug}`),
      [`/film/${slug}/${slug === "linz" ? "der-perfekte-urlaub" : "godzilla-minus-zero"}`]:
        detail ?? (await fixture(`megaplex-${slug}-detail`)),
    }),
  );

test("Diesel preserves millisecond times and exact booking suffixes, retaining concert films but not live relays", async () => {
  const catalog = await diesel(await fixture("dieselkino-gleisdorf"));
  expect(catalog.fetchedCinemaIds).toEqual([42]);
  expect(catalog.movies.map((movie) => movie.providerFilmId)).toEqual([
    "8374",
    "8343",
    "8484",
  ]);
  expect(catalog.showings).toHaveLength(3);
  expect(catalog.showings[0]).toMatchObject({
    provider: "DieselKino",
    cinemaId: 42,
    providerFilmId: "8374",
    providerSessionId: "987953",
    dateTime: new Date("2026-11-09T17:00:00Z"),
    bookingUrl:
      "https://kinoapi.dieselkino.at/?performanceId=987953d&cinemaNumber=04",
    evidence: { originalTitle: "Heart of the Beast", runtimeMinutes: 101 },
  });
  expect(catalog.showings[0]?.showingAdditionalData).toContain("Saal 5");
  expect(catalog.movies[2]?.name).toBe("Rammstein – Live in Mexico City");
});

test.each([
  [
    "wrong cinema",
    '"website": "https://gleisdorf.dieselkino.at/"',
    '"website": "https://braunau.dieselkino.at/"',
  ],
  [
    "seconds instead of milliseconds",
    '"timeUtc": 1794243600000',
    '"timeUtc": 1794243600',
  ],
  ["wrong booking cinema", "cinemaNumber=04", "cinemaNumber=90"],
  ["wrong booking session", "performanceId=987953d", "performanceId=123d"],
])(
  "Diesel rejects %s instead of returning a partial catalogue",
  async (_, from, to) => {
    const html = await fixture("dieselkino-gleisdorf");
    expect(html).toContain(from);
    await expect(diesel(html.replace(from, to))).rejects.toThrow();
  },
);

test("Diesel distinguishes public visibility from purchase restrictions", async () => {
  const html = await fixture("dieselkino-gleisdorf");
  expect(
    (
      await diesel(
        html.replaceAll('"purchaseUntil": null', '"purchaseUntil": 1'),
      )
    ).showings,
  ).toHaveLength(3);
  await expect(
    diesel(
      html.replaceAll('"visibleFrom": null', '"visibleFrom": 4102444800000'),
    ),
  ).rejects.toThrow("No DieselKino film screenings");
});

test("Diesel rejects conflicting movie records sharing a native film ID", async () => {
  const html = await fixture("dieselkino-gleisdorf");
  await expect(
    diesel(html.replace('"id": "8343"', '"id": "8374"')),
  ).rejects.toThrow("Conflicting DieselKino film");
});

test("Star keeps native identity, Vienna instants and explicit film facts rather than release years", async () => {
  const catalog = await star();
  expect(catalog.fetchedCinemaIds).toEqual([43]);
  expect(catalog.movies).toHaveLength(1);
  expect(catalog.movies[0]).toMatchObject({
    name: "Minions And Monster",
    providerFilmId: "regau:7836",
    evidence: {
      originalTitle: "Minions 3",
      productionYear: 2025,
      runtimeMinutes: 95,
      director: "Pierre Coffin",
    },
  });
  expect(catalog.showings).toHaveLength(2);
  expect(catalog.showings[0]).toMatchObject({
    provider: "StarMovie",
    cinemaId: 43,
    providerSessionId: "regau:163105",
    dateTime: new Date("2026-11-07T12:30:00Z"),
    showingAdditionalData: ["2D"],
    bookingUrl:
      "https://www.starmovie.at/star-movie-regau/memberbereich/online-reservierung/?programId=163105",
  });
});

test("Star date-filter-hidden and purchase-only shows remain listed, expired and disabled shows do not", async () => {
  const $ = load(await fixture("starmovie-regau"));
  $("a.movie-card__time").addClass("hidden purchase-only");
  expect((await star($.html())).showings).toHaveLength(2);
  $("a.movie-card__time").first().addClass("is-expired");
  expect(
    (await star($.html())).showings.map((show) => show.providerSessionId),
  ).toEqual(["regau:163038"]);
  $("a.movie-card__time").last().attr("aria-disabled", "true");
  await expect(star($.html())).rejects.toThrow("empty or unsupported");
});

test.each([
  [
    "wrong page location",
    'App.currentLocation = "regau"',
    'App.currentLocation = "liezen"',
  ],
  [
    "millisecond timestamp",
    'data-program-time="1794054600"',
    'data-program-time="1794054600000"',
  ],
  [
    "wrong booking venue",
    "/star-movie-regau/memberbereich/",
    "/star-movie-liezen/memberbereich/",
  ],
])("Star rejects %s", async (_, from, to) => {
  const html = await fixture("starmovie-regau");
  expect(html).toContain(from);
  await expect(star(html.replace(from, to))).rejects.toThrow();
});

test("Megaplex imports the full HTML programme beyond the 20-event JSON-LD cap", async () => {
  const catalog = await megaplex("linz");
  expect(catalog.fetchedCinemaIds).toEqual([44]);
  expect(catalog.movies).toHaveLength(1);
  expect(catalog.showings).toHaveLength(38);
  expect(catalog.movies[0]).toMatchObject({
    name: "Der perfekte Urlaub",
    providerFilmId: "58380",
    evidence: { director: "Bora Dagtekin", runtimeMinutes: 126 },
  });
  expect(catalog.showings[0]).toMatchObject({
    providerSessionId: "linz:547011",
    dateTime: new Date("2026-11-06T14:15:00Z"),
    bookingUrl: "https://www.megaplex.at/ticket/58380/547011",
    showingAdditionalData: ["Dolby Vision 2D"],
  });
  expect(catalog.showings.at(-1)?.bookingUrl).toBe(
    "https://www.megaplex.at/ticket/58380/547332",
  );
});

test("Metropol accepts its first-party venue domain but rejects another Megaplex venue", async () => {
  const catalog = await megaplex("metropol");
  expect(catalog.showings).toHaveLength(9);
  expect(catalog.showings[0]).toMatchObject({
    providerSessionId: "metropol:335573",
    dateTime: new Date("2026-11-06T19:45:00Z"),
    bookingUrl: "https://www.megaplex.at/ticket/59197/335573",
  });
  const html = await fixture("megaplex-metropol-detail");
  await expect(
    megaplex(
      "metropol",
      html.replaceAll(
        "https://www.metropol-kino.at/kinoprogramm/metropol",
        "https://www.megaplex.at/kinoprogramm/linz",
      ),
    ),
  ).rejects.toThrow("another cinema");
});

test("Megaplex rejects an empty individual film response without discarding valid advance releases", async () => {
  const programme = `${await fixture("megaplex-metropol")}<a href="/film/metropol/advance-film">Advance film</a>`;
  const detail = await fixture("megaplex-metropol-detail");
  const read = (advance: string) =>
    getMegaplexMovies(
      44,
      "metropol",
      transport({
        "/kinoprogramm/metropol": programme,
        "/film/metropol/godzilla-minus-zero": detail,
        "/film/metropol/advance-film": advance,
      }),
    );
  await expect(
    read("<html>Upstream programme unavailable</html>"),
  ).rejects.toThrow();
  const $ = load(detail.replaceAll("godzilla-minus-zero", "advance-film"));
  $(".day-group").remove();
  $("script[type='application/ld+json']").each((_, el) => {
    if (/"@type"\s*:\s*"ScreeningEvent"/.test($(el).text())) $(el).remove();
  });
  expect((await read($.html())).showings).toHaveLength(9);
});

test.each([
  ["12.07.2026", "20:15", "2026-07-12T18:15:00Z"],
  ["12.12.2026", "20:15", "2026-12-12T19:15:00Z"],
  ["29.03.2026", "02:30", null],
  ["25.10.2026", "02:30", null],
])(
  "Megaplex resolves Vienna wall times, refusing DST gaps/folds: %s %s",
  async (date, time, expected) => {
    const $ = load(await fixture("megaplex-metropol-detail"));
    // Derived controls isolate wall times when the site supplies no event instant.
    $("script[type='application/ld+json']").each((_, el) => {
      if (/"@type"\s*:\s*"ScreeningEvent"/.test($(el).text())) $(el).remove();
    });
    $(".day-group").slice(1).remove();
    $(".day-group h3").text(date);
    $(".day-group a").slice(1).remove();
    $(".day-group a").first().attr("title", time);
    if (expected)
      expect(
        (await megaplex("metropol", $.html())).showings[0]?.dateTime,
      ).toEqual(new Date(expected));
    else
      await expect(megaplex("metropol", $.html())).rejects.toThrow(
        "ambiguous or nonexistent",
      );
  },
);

test("all Austrian readers fail closed on empty pages and transport failures", async () => {
  for (const read of [
    (request: typeof fetchTextWithBun) =>
      getDieselKinoMovies(42, "gleisdorf", request),
    (request: typeof fetchTextWithBun) =>
      getStarMovieMovies(43, "regau", request),
    (request: typeof fetchTextWithBun) =>
      getMegaplexMovies(44, "linz", request),
  ]) {
    await expect(
      read(async () => ({ status: 200, body: "<html></html>" })),
    ).rejects.toThrow();
    await expect(
      read(async () => ({ status: 503, body: "Unavailable" })),
    ).rejects.toThrow();
    await expect(
      read(async () => {
        throw new Error("Connection failed");
      }),
    ).rejects.toThrow("Connection failed");
  }
});
