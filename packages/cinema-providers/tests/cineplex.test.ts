import { expect, spyOn, test } from "bun:test";

import { getCineplexMovies } from "@waslaeuftin/cinema-providers/server";

test("identity evidence: cineplex preserves native film IDs and only director credits", async () => {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      data: {
        screenedMovies: [
          {
            id: "screened-film-1",
            movie: {
              id: "TW92aWU6MjI2MTQ=",
              title: "Rocky",
              duration: 114,
              directedBy: "von Presentation Name",
              releaseDate: "2026-11-05",
              credits: [
                {
                  department: "DIRECTING",
                  role: "Regie",
                  person: { fullName: " John G. Avildsen " },
                },
                {
                  department: "DIRECTING",
                  role: "Assistant Director",
                  person: { fullName: "Assistant" },
                },
                {
                  department: "ACTING",
                  role: "Director",
                  person: { fullName: "Actor" },
                },
              ],
              screenings: [
                {
                  cinema: { id: "identity-test" },
                  onlineTicketingId: "ticket-1",
                  datetime: "2026-11-05T18:00:00Z",
                  auditoriumName: "Saal 2",
                  attributes: [],
                },
              ],
            },
          },
        ],
      },
    }),
  );
  try {
    const catalog = await getCineplexMovies([
      { cinemaId: 42, cineplexCinemaId: "identity-test" },
    ]);
    expect(catalog.movies[0]).toMatchObject({
      provider: "Cineplex",
      providerFilmId: "TW92aWU6MjI2MTQ=",
      evidence: { director: "John G. Avildsen", runtimeMinutes: 114 },
    });
    expect(catalog.showings[0]).toMatchObject({
      provider: "Cineplex",
      providerFilmId: "TW92aWU6MjI2MTQ=",
      evidence: { director: "John G. Avildsen", runtimeMinutes: 114 },
    });
    const body = request.mock.calls[0]?.[1]?.body;
    expect(typeof body).toBe("string");
    if (typeof body !== "string")
      throw new Error("Expected a JSON request body");
    const { query } = JSON.parse(body) as { query: string };
    expect(query).toContain("duration");
    expect(query).toContain("credits(departments: [DIRECTING])");
    expect(query).toContain("fullName");
  } finally {
    request.mockRestore();
  }
});

test("identity evidence: cineplex omits invalid runtimes and presentation-only directors", async () => {
  const request = spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      data: {
        screenedMovies: [
          {
            id: "partial",
            movie: [undefined, null, 0, -1, 99.5, "99", 1e20].map(
              (duration, index) => ({
                id: `film-${index}`,
                title: "Film",
                duration,
                directedBy: "von Presentation Name",
                releaseDate: "2026-11-05",
                credits: [
                  null,
                  {
                    department: "DIRECTING",
                    role: "Assistant Director",
                    person: { fullName: "Assistant" },
                  },
                ],
                screenings: [
                  {
                    cinema: { id: "partial-test" },
                    onlineTicketingId: "ticket",
                    datetime: "2026-11-05T18:00:00Z",
                    auditoriumName: "",
                    attributes: [],
                  },
                ],
              }),
            ),
          },
        ],
      },
    }),
  );
  try {
    const catalog = await getCineplexMovies([
      { cinemaId: 42, cineplexCinemaId: "partial-test" },
    ]);
    expect(catalog.movies).toHaveLength(7);
    expect(catalog.showings).toHaveLength(7);
    for (const movie of catalog.movies) expect(movie.evidence).toBeUndefined();
    for (const showing of catalog.showings)
      expect(showing.evidence).toBeUndefined();
    expect(catalog.movies.map((movie) => movie.providerFilmId)).toEqual([
      "film-0",
      "film-1",
      "film-2",
      "film-3",
      "film-4",
      "film-5",
      "film-6",
    ]);
  } finally {
    request.mockRestore();
  }
});

test.each([502, 503, 504])(
  "cineplex: recovers from HTTP %s without losing screenings",
  async (status) => {
    const request = spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Bad Gateway", { status }))
      .mockResolvedValueOnce(
        Response.json({
          data: {
            screenedMovies: [
              {
                id: "film-1",
                movie: [
                  {
                    title: "Recovered movie",
                    screenings: [
                      {
                        cinema: { id: "retry-test" },
                        onlineTicketingId: "ticket-1",
                        datetime: "2026-11-05T18:00:00Z",
                        auditoriumName: "Saal 2",
                        attributes: [{ label: "OV" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      );
    try {
      const result = await getCineplexMovies([
        { cinemaId: 42, cineplexCinemaId: "retry-test" },
      ]);
      expect(result.showings).toEqual([
        {
          cinemaId: 42,
          movieName: "Recovered movie",
          provider: "Cineplex",
          providerFilmId: undefined,
          dateTime: new Date("2026-11-05T18:00:00Z"),
          bookingUrl: "https://buchung.cineplex.de/checkout/ticket-1init",
          showingAdditionalData: ["Saal 2", "OV"],
        },
      ]);
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      request.mockRestore();
    }
  },
);

test("cineplex: stops after three attempts when the gateway stays unavailable", async () => {
  const request = spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(new Response("Bad Gateway", { status: 502 })),
  );
  try {
    const error = await getCineplexMovies([
      { cinemaId: 42, cineplexCinemaId: "retry-test" },
    ]).catch((error: unknown) => error);
    expect(error).toMatchObject({
      name: "ServerError",
      message: "Response not successful: Received status code 502",
    });
    expect(request).toHaveBeenCalledTimes(3);
  } finally {
    request.mockRestore();
  }
});

test.each([400, 401, 403, 429, 500])(
  "cineplex: does not retry HTTP %s",
  async (status) => {
    const request = spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response("Request failed", { status })),
    );
    try {
      const error = await getCineplexMovies([
        { cinemaId: 42, cineplexCinemaId: "retry-test" },
      ]).catch((error: unknown) => error);
      expect(error).toMatchObject({
        name: "ServerError",
        message: `Response not successful: Received status code ${status}`,
      });
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      request.mockRestore();
    }
  },
);

test(
  "cineplex: Rundkino Dresden",
  async () => {
    try {
      const { movies, showings } = await getCineplexMovies([
        { cineplexCinemaId: "Q2luZW1hOjIyNA==", cinemaId: -1 },
      ]);

      console.info(
        `Got ${movies.length} movies with ${showings.length} showings for cineplex Rundkino Dresden`,
      );

      expect(movies.length).toBeGreaterThan(0);
      expect(showings.length).toBeGreaterThan(0);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("502") ||
          error.message.includes("Unexpected token") ||
          error.message.includes("Parse error"))
      ) {
        console.warn(
          `Skipping cineplex test due to external API error (likely 502/Cloudflare protection): ${error.message}`,
        );
      } else {
        throw error;
      }
    }
  },
  { timeout: 20000 },
);
