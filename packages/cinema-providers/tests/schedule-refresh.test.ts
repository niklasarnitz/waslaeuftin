import { expect, spyOn, test } from "bun:test";

test("repeated Kinoheld and Cineplex fetches request fresh schedules", async () => {
  let kinoheldRequests = 0;
  let cineplexRequests = 0;
  const request = spyOn(globalThis, "fetch").mockImplementation((url) => {
    const href =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const cineplex = href.includes("cineplex");
    if (cineplex) cineplexRequests++;
    else kinoheldRequests++;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: cineplex
            ? { screenedMovies: [] }
            : {
                showGroups: {
                  paginatorInfo: { hasMorePages: false },
                  data: [
                    {
                      movie: { title: `Schedule ${kinoheldRequests}` },
                      cinema: { urlSlug: "cinema", city: { urlSlug: "city" } },
                      shows: { data: [] },
                    },
                  ],
                },
              },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
  });
  try {
    const { getKinoHeldMoviesInner } =
      await import("@waslaeuftin/cinema-providers/internal/providers/kinoheld/getKinoHeldMovies");
    const { getCineplexMovies } =
      await import("@waslaeuftin/cinema-providers/internal/providers/cineplex/getCinePlexMovies");
    const metadata = {
      id: -1,
      centerId: "refresh-test",
      centerShorty: "cinema",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect((await getKinoHeldMoviesInner(metadata))[0]?.movie.title).toBe(
      "Schedule 1",
    );
    expect((await getKinoHeldMoviesInner(metadata))[0]?.movie.title).toBe(
      "Schedule 2",
    );
    await getCineplexMovies([
      { cinemaId: -1, cineplexCinemaId: "refresh-test" },
    ]);
    await getCineplexMovies([
      { cinemaId: -1, cineplexCinemaId: "refresh-test" },
    ]);
    expect(kinoheldRequests).toBe(2);
    expect(cineplexRequests).toBe(2);
  } finally {
    request.mockRestore();
  }
});
