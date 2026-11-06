import { expect, spyOn, test } from "bun:test";

import type { ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";
import { getKinoHeldBookingUrl } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/getKinoHeldBookingUrl";
import { getKinoHeldMovies } from "@waslaeuftin/cinema-providers/server";

const moviacKinoMetadata = {
  centerShorty: "moviac-kino-kaiserhof",
  centerId: "NDU2MzE4MA",
  createdAt: new Date(),
  updatedAt: new Date(),
  id: -2,
};

test("identity evidence: kinoheld retains production metadata and same-title film IDs", async () => {
  const queries: string[] = [];
  const respond = (
    _: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    if (typeof init?.body !== "string")
      throw new Error("Expected a JSON request body");
    const { query } = JSON.parse(init.body) as { query: string };
    queries.push(query);
    return Promise.resolve(
      Response.json({
        data: query.includes("FetchCinemaAuditoriumCount")
          ? { cinema: { auditoriums: { data: [{ id: "one" }] } } }
          : {
              showGroups: {
                paginatorInfo: { hasMorePages: false },
                data: ["96025", "other-film"].map((id) => ({
                  movie: {
                    id,
                    title: "Film",
                    titleOriginal: "Original Film",
                    productionYear: "1993",
                    duration: 125,
                    directors: [{ name: " Jonathan Demme " }, { name: "" }],
                    trailers:
                      id === "96025"
                        ? [
                            { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUIc" },
                            { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUIc" },
                            { format: "VIMEO", remoteVideoId: "Abcdefghijk" },
                            { format: "YOUTUBE", remoteVideoId: "Abc_123-XyZ" },
                          ]
                        : [{ format: "YOUTUBE", remoteVideoId: "Zyxwvutsrq0" }],
                    released: "2026-11-05",
                  },
                  cinema: {
                    urlSlug: "test-cinema",
                    city: { urlSlug: "test-city" },
                  },
                  shows: {
                    data: [
                      {
                        urlSlug: `show-${id}`,
                        beginning: "2026-11-05T18:00:00Z",
                        flags: [],
                        auditorium: null,
                        deeplink: null,
                      },
                    ],
                  },
                })),
              },
            },
      }),
    );
  };
  const request = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(respond, { preconnect: fetch.preconnect }),
  );
  try {
    const catalog = await getKinoHeldMovies(42, {
      ...moviacKinoMetadata,
      centerId: "identity-test",
    });
    expect(catalog.movies).toMatchObject([
      {
        provider: "KinoHeld",
        providerFilmId: "96025",
        evidence: {
          originalTitle: "Original Film",
          productionYear: 1993,
          runtimeMinutes: 125,
          director: "Jonathan Demme",
          youtubeTrailerIds: ["aHw4PuLCUIc", "Abc_123-XyZ"],
        },
      },
      {
        provider: "KinoHeld",
        providerFilmId: "other-film",
        evidence: {
          productionYear: 1993,
          youtubeTrailerIds: ["Zyxwvutsrq0"],
        },
      },
    ]);
    expect(catalog.showings).toMatchObject([
      {
        provider: "KinoHeld",
        providerFilmId: "96025",
        evidence: {
          originalTitle: "Original Film",
          productionYear: 1993,
          runtimeMinutes: 125,
          director: "Jonathan Demme",
          youtubeTrailerIds: ["aHw4PuLCUIc", "Abc_123-XyZ"],
        },
      },
      {
        provider: "KinoHeld",
        providerFilmId: "other-film",
        evidence: {
          productionYear: 1993,
          youtubeTrailerIds: ["Zyxwvutsrq0"],
        },
      },
    ]);
    const query = queries.find((value) =>
      value.includes("FetchShowGroupsForCinema"),
    );
    expect(query).toContain("titleOriginal");
    expect(query).toContain("productionYear");
    expect(query).toContain("duration");
    expect(query).toContain("directors");
    expect(query).toMatch(
      /trailers\s*\{\s*format\s+remoteVideoId\s+(?:__typename\s*)?\}/,
    );
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: kinoheld ignores invalid fields independently and accepts partial movies", async () => {
  const metadata = [
    {},
    {
      productionYear: "2026-11-05",
      duration: 0,
      titleOriginal: " ",
      directors: [null, { name: 123 }],
      trailers: null,
    },
    { productionYear: "1700", duration: -1, trailers: [] },
    { productionYear: "2101", duration: 12.5, trailers: "aHw4PuLCUIc" },
    {
      productionYear: "1993/2026",
      duration: "125",
      trailers: [
        null,
        {},
        { format: "YOUTUBE" },
        { format: "YOUTUBE", remoteVideoId: null },
        { format: "YOUTUBE", remoteVideoId: 12345678901 },
        { remoteVideoId: "aHw4PuLCUIc" },
      ],
    },
    {
      productionYear: 1993,
      duration: 1e20,
      trailers: [
        { format: "YOUTUBE", remoteVideoId: "" },
        { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUI" },
        { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUIcc" },
        { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUI!" },
        { format: "YOUTUBE", remoteVideoId: "aHw4PuLCUIc\n" },
        { format: "YOUTUBE", remoteVideoId: " aHw4PuLCUIc " },
        { format: "YOUTUBE", remoteVideoId: "https://youtu.be/aHw4PuLCUIc" },
      ],
    },
    {
      productionYear: "invalid",
      duration: 125,
      trailers: [
        { format: "VIMEO", remoteVideoId: "aHw4PuLCUIc" },
        { format: "youtube", remoteVideoId: "aHw4PuLCUIc" },
      ],
    },
  ];
  const respond = (
    _: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    if (typeof init?.body !== "string")
      throw new Error("Expected a JSON request body");
    const { query } = JSON.parse(init.body) as { query: string };
    return Promise.resolve(
      Response.json({
        data: query.includes("FetchCinemaAuditoriumCount")
          ? { cinema: { auditoriums: { data: [] } } }
          : {
              showGroups: {
                paginatorInfo: { hasMorePages: false },
                data: metadata.map((fields) => ({
                  movie: { title: "Film", released: "2026-11-05", ...fields },
                  cinema: {
                    urlSlug: "test-cinema",
                    city: { urlSlug: "test-city" },
                  },
                  shows: {
                    data: [
                      {
                        urlSlug: "show",
                        beginning: "2026-11-05T18:00:00Z",
                        flags: [],
                        auditorium: null,
                        deeplink: null,
                      },
                    ],
                  },
                })),
              },
            },
      }),
    );
  };
  const request = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(respond, { preconnect: fetch.preconnect }),
  );
  try {
    const catalog = await getKinoHeldMovies(42, {
      ...moviacKinoMetadata,
      centerId: "partial-test",
    });
    const expected = [
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { runtimeMinutes: 125 },
    ];
    expect(catalog.movies.map((movie) => movie.evidence)).toEqual(expected);
    expect(catalog.showings.map((showing) => showing.evidence)).toEqual(
      expected,
    );
  } finally {
    request.mockRestore();
  }
});

const expectKinoHeldBookingUrls = (
  showings: Awaited<ReturnType<typeof getKinoHeldMovies>>["showings"],
  expected: { citySlug: string; cinemaSlug: string },
) => {
  if (showings.length === 0) {
    return;
  }

  for (const showing of showings) {
    expect(showing.bookingUrl).toBeTruthy();
    expect(showing.bookingUrl).not.toContain("undefined");
    expect(showing.bookingUrl).not.toContain("null");

    const url = new URL(showing.bookingUrl);
    const showSlug = url.pathname.split("/").at(-1);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.kinoheld.de");
    expect(
      url.pathname.startsWith(
        `/kino/${expected.citySlug}/${expected.cinemaSlug}/show/`,
      ),
    ).toBe(true);
    expect(url.searchParams.get("mode")).toBe("widget");
    expect(url.searchParams.get("showId")).toBe(showSlug);
    expect(url.searchParams.get("rb")).toBe("0");
    expect(url.searchParams.get("change")).toBe("0");
  }
};

test("kinoheld: builds widget booking URLs", () => {
  const movie = {
    cinema: {
      urlSlug: "moviac-kino-kaiserhof",
      city: {
        urlSlug: "baden-baden",
      },
    },
  } as ShowGroup;
  const showing = {
    urlSlug: "12708",
  } as ShowGroup["shows"]["data"][number];

  expect(getKinoHeldBookingUrl(movie, showing)).toBe(
    "https://www.kinoheld.de/kino/baden-baden/moviac-kino-kaiserhof/show/12708?mode=widget&showId=12708&rb=0&change=0",
  );
});

test(
  "kinoheld: Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-leonberg",
      centerId: "MjI2MDM4MA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);

test(
  "kinoheld: moviac - Kino im Kaiserhof booking URLs",
  async () => {
    const { showings } = await getKinoHeldMovies(-1, moviacKinoMetadata);

    expectKinoHeldBookingUrls(showings, {
      citySlug: "baden-baden",
      cinemaSlug: "moviac-kino-kaiserhof",
    });
  },
  { timeout: 20000 },
);

test(
  "kinoheld: IMAX Traumpalast Leonberg",
  async () => {
    const { movies, showings } = await getKinoHeldMovies(-1, {
      centerShorty: "traumpalast-imax-leonberg",
      centerId: "Mzg0MDgyOA",
      createdAt: new Date(),
      updatedAt: new Date(),
      id: -2,
    });

    console.info(
      `Got ${movies.length} movies with ${showings.length} showings for IMAX Traumpalast Leonberg`,
    );

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
  },
  { timeout: 20000 },
);
