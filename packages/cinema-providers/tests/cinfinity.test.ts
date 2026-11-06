import { expect, spyOn, test } from "bun:test";

import {
  getCinfinityCinemas,
  getCinfinityMovies,
} from "@waslaeuftin/cinema-providers/server";

test("identity evidence: cinfinity keeps same-title native films and clean directors", async () => {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      data: {
        screenings: [
          {
            id: "first",
            title: "Film",
            duration: 99,
            credits: [
              {
                department: "DIRECTING",
                role: "Regie",
                person: { fullName: " Ed Herzog " },
              },
              {
                department: "DIRECTING",
                role: "Assistant Director",
                person: { fullName: "Assistant" },
              },
            ],
          },
          {
            id: "second",
            title: "Film",
            duration: 118,
            credits: [
              {
                department: "DIRECTING",
                role: "Director",
                person: { fullName: "Michael Showalter" },
              },
              {
                department: "ACTING",
                role: "Director",
                person: { fullName: "Actor" },
              },
            ],
          },
        ].map((movie) => ({
          movie,
          datetime: "2026-11-05T18:00:00Z",
          onlineTicketingId: "ticket",
          isInfoOnly: false,
          auditoriumName: "Saal 1",
          cinema: { id: "identity-test", website: "https://example.org" },
          attributes: [],
        })),
      },
    }),
  );
  try {
    const catalog = await getCinfinityMovies([
      { cinemaId: 42, cinfinityCinemaId: "identity-test" },
    ]);
    expect(catalog.movies).toMatchObject([
      {
        provider: "Cinfinity",
        providerFilmId: "first",
        evidence: { director: "Ed Herzog", runtimeMinutes: 99 },
      },
      {
        provider: "Cinfinity",
        providerFilmId: "second",
        evidence: { director: "Michael Showalter", runtimeMinutes: 118 },
      },
    ]);
    expect(catalog.showings).toMatchObject([
      {
        provider: "Cinfinity",
        providerFilmId: "first",
        evidence: { director: "Ed Herzog", runtimeMinutes: 99 },
      },
      {
        provider: "Cinfinity",
        providerFilmId: "second",
        evidence: { director: "Michael Showalter", runtimeMinutes: 118 },
      },
    ]);
    const body = request.mock.calls[0]?.[1]?.body;
    if (typeof body !== "string")
      throw new Error("Expected a JSON request body");
    const { query } = JSON.parse(body) as {
      query: string;
    };
    expect(query).toContain("duration");
    expect(query).toContain("credits(departments: [DIRECTING])");
    expect(query).toContain("fullName");
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: cinfinity omits invalid or absent metadata without dropping screenings", async () => {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      data: {
        screenings: [
          {},
          { duration: null },
          { duration: 0 },
          { duration: -1 },
          { duration: 99.5 },
          { duration: "99" },
          { duration: 1e20 },
        ].map((metadata) => ({
          movie: {
            title: "Film",
            directedBy: "von Presentation Name",
            releaseDate: "2026-11-05",
            ...metadata,
          },
          datetime: "2026-11-05T18:00:00Z",
          onlineTicketingId: null,
          isInfoOnly: false,
          auditoriumName: "",
          cinema: { id: "partial-test" },
          attributes: [],
        })),
      },
    }),
  );
  try {
    const catalog = await getCinfinityMovies([
      { cinemaId: 42, cinfinityCinemaId: "partial-test" },
    ]);
    expect(catalog.movies).toHaveLength(7);
    expect(catalog.showings).toHaveLength(7);
    for (const movie of catalog.movies) {
      expect(movie.providerFilmId).toBeUndefined();
      expect(movie.evidence).toBeUndefined();
    }
    for (const showing of catalog.showings)
      expect(showing.evidence).toBeUndefined();
  } finally {
    request.mockRestore();
  }
});

test(
  "cinfinity: fetches cinemas",
  async () => {
    const cinemas = await getCinfinityCinemas();

    expect(cinemas.length).toBeGreaterThan(0);
    expect(cinemas.some((cinema) => cinema.id === "Q2luZW1hOjMxOA==")).toBe(
      true,
    );
  },
  { timeout: 20000 },
);

test(
  "cinfinity: Kinopark Aalen",
  async () => {
    const { movies, showings } = await getCinfinityMovies([
      {
        cinemaId: -1,
        cinfinityCinemaId: "Q2luZW1hOjMxOA==",
      },
    ]);

    expect(movies.length).toBeGreaterThan(0);
    expect(showings.length).toBeGreaterThan(0);
    expect(showings.every((showing) => showing.cinemaId === -1)).toBe(true);
  },
  { timeout: 20000 },
);
