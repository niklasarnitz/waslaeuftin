import { expect, spyOn, test } from "bun:test";

import { getCineplexMovies } from "@waslaeuftin/cinema-providers/server";

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
