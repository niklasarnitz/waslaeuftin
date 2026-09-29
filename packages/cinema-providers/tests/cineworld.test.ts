import { afterEach, expect, test } from "bun:test";

import {
  boxofficeChains,
  getBoxofficeMovies,
  getBoxofficeSiteData,
} from "@waslaeuftin/cinema-providers/server";

const skipExternalApiError = (error: unknown) => {
  if (
    error instanceof Error &&
    /status code|fetch|connect|proxy|socket|timed? ?out|ECONN|abort/i.test(
      error.message,
    )
  ) {
    console.warn(
      `Skipping cineworld test due to an external API error: ${error.message}`,
    );
    return;
  }

  throw error;
};

const liveTheaters = [
  { id: "X06V1", name: "London - Leicester Square" },
  { id: "X087G", name: "London - The O2 Greenwich" },
  { id: "X079R", name: "Manchester - Didsbury" },
];

test(
  "cineworld: Leicester Square, The O2 Greenwich, Manchester Didsbury",
  async () => {
    try {
      const siteData = await getBoxofficeSiteData(boxofficeChains.cineworld);

      expect(siteData.theaters.length).toBeGreaterThan(0);
      expect(siteData.movieTitles.size).toBeGreaterThan(0);

      for (const theater of liveTheaters) {
        const { movies, showings } = await getBoxofficeMovies(
          -1,
          theater.id,
          siteData,
        );

        console.info(
          `Got ${movies.length} movies with ${showings.length} showings for Cineworld ${theater.name}`,
        );

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0);

        for (const showing of showings) {
          expect(Number.isNaN(showing.dateTime.getTime())).toBe(false);
          expect(showing.bookingUrl).toStartWith("https://");
        }
      }
    } catch (error) {
      skipExternalApiError(error);
    }
  },
  { timeout: 120000 },
);

// Offline: maps trimmed responses recorded from cineworld.co.uk (2026-09-17).

const ASSET_PREFIX =
  "https://cms-assets.webediamovies.pro/prod/cineworld-cinemas/2026-09-17/public/";

const recordedResponses: Record<string, unknown> = {
  "https://www.cineworld.co.uk/cinemas": `<html><head><script src="${ASSET_PREFIX}webpack-runtime-be54fc8e7ba45df5d087.js" async=""></script></head></html>`,
  [`${ASSET_PREFIX}page-data/cinemas/page-data.json`]: {
    componentChunkName: "component---src-templates-page-tsx",
    path: "/cinemas",
    staticQueryHashes: ["1575531621", "1847294491", "2506275789", "3836549025"],
  },
  [`${ASSET_PREFIX}page-data/sq/d/1575531621.json`]: {
    data: {
      allAttribute: {
        nodes: [
          ["Format.Projection.Digital", "2D"],
          ["Format.Projection.3d", "REALD-3D"],
          ["Format.Projection.Imax", "IMAX"],
          ["Auditorium.Experience.4dx", "4DX"],
          ["Auditorium.Experience.InfinityVision", "INFINITY VISION"],
        ].map(([tag, label]) => ({
          id: `X06V1_${tag}`,
          tag,
          localizations: [{ label, locale: "en-GB", combinedTags: null }],
        })),
      },
    },
  },
  [`${ASSET_PREFIX}page-data/sq/d/1847294491.json`]: {
    data: { allMenu: { nodes: [] } },
  },
  [`${ASSET_PREFIX}page-data/sq/d/2506275789.json`]: {
    data: {
      allTheater: {
        nodes: [
          {
            id: "X06V1",
            path: "/theaters/x06v1-cineworld-cinema-london-leicester-square",
            name: "London - Leicester Square",
            timeZone: "Europe/London",
            practicalInfo: {
              closed: false,
              coordinates: { latitude: 51.5108, longitude: -0.1304 },
              location: { city: "London", zip: "WC2H 7NA" },
            },
          },
        ],
      },
    },
  },
  [`${ASSET_PREFIX}page-data/sq/d/3836549025.json`]: {
    data: {
      allMovie: {
        nodes: [
          {
            id: "1000036867",
            path: "/films/1000036867-avengers-endgame-re-release",
            title: "Avengers: Endgame (Re-Release)",
          },
          {
            id: "19776",
            path: "/films/19776-cineworld-30-the-matrix",
            title: "Cineworld 30: The Matrix ",
          },
        ],
      },
    },
  },
  "https://www.cineworld.co.uk/api/gatsby-source-boxofficeapi/movies?basic=false&castingLimit=10&ids=1000036867&ids=19776":
    [
      {
        id: "1000036867",
        title: "Avengers: Endgame (Re-Release)",
        locale: { title: "Avengers: Endgame (Re-Release)" },
      },
      {
        id: "19776",
        title: "Cineworld 30: The Matrix ",
        locale: { title: "The Matrix" },
      },
    ],
  // Not in the site build, so it is looked up on its own.
  "https://www.cineworld.co.uk/api/gatsby-source-boxofficeapi/movies?basic=false&castingLimit=10&ids=1000050581":
    [
      {
        id: "1000050581",
        title: "Dune: Part Three - The IMAX Experience",
        locale: { title: "Dune: Part Three - The IMAX Experience" },
      },
    ],
};

const showtime = (
  movieId: string,
  startsAt: string,
  tags: string[],
  orderId: string,
  screen?: { name: string },
) => ({
  id: `${movieId}-${startsAt.replace("T", " ")}-${tags.join(",")}`,
  startsAt,
  tags,
  isExpired: false,
  data: {
    ticketing: [
      {
        urls: [`https://web.cineworld.co.uk/order/showtimes/${orderId}/seats`],
        type: "DESKTOP",
        provider: "default",
      },
      {
        urls: [
          `https://relay.mvtx.us/ticketing/dbz?code_theater=X06V1&gid_entity=movie.movie._.${movieId}`,
        ],
        type: "DESKTOP",
        provider: "relay",
      },
    ],
  },
  occupancy: { rate: null },
  ...(screen ? { screen } : {}),
  nextShowtimes: [],
});

const recordedSchedule = {
  X06V1: {
    schedule: {
      "1000036867": {
        "2026-09-25": [
          showtime(
            "1000036867",
            "2026-09-25T10:00:00",
            [
              "Format.Projection.Imax",
              "Format.Projection.Digital",
              "Showtime.Event.BigScreenClassics",
            ],
            "103-118932",
          ),
          showtime(
            "1000036867",
            "2026-09-25T11:40:00",
            [
              "Format.Projection.3d",
              "Auditorium.Experience.4dx",
              "Showtime.Event.BigScreenClassics",
              "Auditorium.Experience.InfinityVision",
            ],
            "103-118939",
            { name: "4" },
          ),
        ],
      },
      "19776": {
        "2026-09-30": [
          showtime(
            "19776",
            "2026-09-30T19:30:00",
            ["Format.Projection.Digital", "Showtime.Event.BigScreenClassics"],
            "103-118109",
          ),
          // The API occasionally returns the same showtime twice.
          showtime(
            "19776",
            "2026-09-30T19:30:00",
            ["Format.Projection.Digital", "Showtime.Event.BigScreenClassics"],
            "103-118109",
          ),
        ],
      },
      "1000050581": {
        // After the switch from BST to GMT.
        "2026-12-15": [
          showtime(
            "1000050581",
            "2026-12-15T19:00:00",
            ["Format.Projection.Imax", "Format.Projection.Digital"],
            "103-120001",
          ),
        ],
      },
    },
    moviesTags: {},
    showtimesDates: ["2026-09-25", "2026-09-30", "2026-12-15"],
  },
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("cineworld: maps recorded responses", async () => {
  const requestedUrls: string[] = [];

  globalThis.fetch = ((input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    requestedUrls.push(url);

    const body = url.includes("/gatsby-source-boxofficeapi/schedule?")
      ? recordedSchedule
      : recordedResponses[url];

    if (body === undefined) {
      return Promise.resolve(new Response("Not found", { status: 404 }));
    }

    return Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status: 200,
      }),
    );
  }) as typeof fetch;

  const siteData = await getBoxofficeSiteData(boxofficeChains.cineworld);

  expect(siteData.assetPrefix).toBe(ASSET_PREFIX);
  expect(siteData.theaters.map((t) => t.id)).toEqual(["X06V1"]);
  expect(siteData.movieTitles.get("19776")).toBe("The Matrix");

  const { movies, showings } = await getBoxofficeMovies(-1, "X06V1", siteData);

  const scheduleUrl = new URL(
    requestedUrls.find((url) => url.includes("/schedule?")) ?? "",
  );
  expect(JSON.parse(scheduleUrl.searchParams.get("theaters") ?? "")).toEqual({
    id: "X06V1",
    timeZone: "Europe/London",
  });

  expect(movies.map((m) => m.name).sort()).toEqual([
    "Avengers: Endgame (Re-Release)",
    "Dune: Part Three - The IMAX Experience",
    "The Matrix",
  ]);

  expect(
    [...showings]
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
      .map((s) => ({
        movieName: s.movieName,
        dateTime: s.dateTime.toISOString(),
        bookingUrl: s.bookingUrl,
        showingAdditionalData: s.showingAdditionalData,
      })),
  ).toEqual([
    {
      movieName: "Avengers: Endgame (Re-Release)",
      // 10:00 BST
      dateTime: "2026-09-25T09:00:00.000Z",
      bookingUrl:
        "https://web.cineworld.co.uk/order/showtimes/103-118932/seats",
      showingAdditionalData: ["IMAX", "2D"],
    },
    {
      movieName: "Avengers: Endgame (Re-Release)",
      dateTime: "2026-09-25T10:40:00.000Z",
      bookingUrl:
        "https://web.cineworld.co.uk/order/showtimes/103-118939/seats",
      showingAdditionalData: ["3D", "4DX", "Infinity Vision", "Screen 4"],
    },
    {
      movieName: "The Matrix",
      dateTime: "2026-09-30T18:30:00.000Z",
      bookingUrl:
        "https://web.cineworld.co.uk/order/showtimes/103-118109/seats",
      showingAdditionalData: ["2D"],
    },
    {
      movieName: "Dune: Part Three - The IMAX Experience",
      // 19:00 GMT
      dateTime: "2026-12-15T19:00:00.000Z",
      bookingUrl:
        "https://web.cineworld.co.uk/order/showtimes/103-120001/seats",
      showingAdditionalData: ["IMAX", "2D"],
    },
  ]);
});
