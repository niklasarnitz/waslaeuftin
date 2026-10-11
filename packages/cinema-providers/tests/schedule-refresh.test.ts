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

test("provider catalogs preserve film IDs and observed identity evidence, not screening years", async () => {
  const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    let body: unknown;
    if (url.includes("premiumkino"))
      body = {
        movies: [
          { id: "film-a", name: "Oldboy", year: 2003, minutes: 120 },
          { id: "film-b", name: "Oldboy", year: 2013, minutes: 104 },
        ],
        performances: ["film-a", "film-b"].map((movieId, index) => ({
          id: `session-${index}`,
          movieId,
          begin: "2026-12-01T18:00:00Z",
          slug: "oldboy",
        })),
      };
    else if (url.includes("filters/dates")) body = ["2026-12-01"];
    else if (url.includes("cineplexx"))
      body = [
        {
          id: "film-at",
          titleCalculated: "Oldboy",
          titleOriginalCalculated: "올드보이",
          directors: ["Park Chan-wook"],
          runTime: 120,
          sessions: [
            {
              id: "session-at",
              showtime: "2026-12-01T18:00:00Z",
              screenName: "1",
              technologies: [],
            },
          ],
        },
      ];
    else if (url.endsWith("/attribute")) body = [];
    else if (url.includes("cinestar"))
      body = [
        {
          id: 9000,
          movie: 670,
          title: "Oldboy",
          showtimes: [{ datetime: "2026-12-01 18:00", attributes: [] }],
        },
      ];
    else
      body = [
        {
          id: "film-comtrada",
          title: "Oldboy",
          originalTitle: "올드보이",
          productionYear: "2003",
          director: "Park Chan-wook",
          lengthInMinutes: 120,
          performances: [
            {
              id: "session-comtrada",
              performanceDateTime: "2026-12-01T18:00:00Z",
            },
          ],
        },
      ];
    return Promise.resolve(Response.json(body));
  });
  try {
    const {
      getPremiumKinoMovies,
      getCineplexxATMovies,
      getCineStarMovies,
      getComtradaCineOrderMovies,
    } = await import("@waslaeuftin/cinema-providers/server");
    const premium = await getPremiumKinoMovies(10, "fixture");
    expect(
      premium.movies.map((movie) => [movie.providerFilmId, movie.evidence]),
    ).toEqual([
      ["film-a", { productionYear: 2003, runtimeMinutes: 120 }],
      ["film-b", { productionYear: 2013, runtimeMinutes: 104 }],
    ]);
    expect(premium.showings[1]).toMatchObject({
      provider: "PremiumKino",
      providerFilmId: "film-b",
      evidence: { productionYear: 2013, runtimeMinutes: 104 },
    });
    const at = await getCineplexxATMovies(11, "fixture");
    expect(at.movies[0]).toMatchObject({
      providerFilmId: "film-at",
      evidence: {
        originalTitle: "올드보이",
        director: "Park Chan-wook",
        runtimeMinutes: 120,
      },
    });
    expect(at.showings.flat()[0]).toMatchObject({
      provider: "CineplexxAT",
      providerFilmId: "film-at",
      evidence: {
        originalTitle: "올드보이",
        director: "Park Chan-wook",
        runtimeMinutes: 120,
      },
    });
    const star = await getCineStarMovies(12, 1);
    expect(star.movies[0]).toMatchObject({
      provider: "CineStar",
      providerFilmId: "670",
    });
    expect(star.showings.flat()[0]).toMatchObject({ providerFilmId: "670" });
    const comtrada = await getComtradaCineOrderMovies(13, {
      id: -1,
      centerId: "fixture",
      centerShorty: "fixture",
      backendUrl: "https://fixture.test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(comtrada.movies[0]).toMatchObject({
      providerFilmId: "film-comtrada",
      evidence: {
        productionYear: 2003,
        originalTitle: "올드보이",
        director: "Park Chan-wook",
        runtimeMinutes: 120,
      },
    });
    expect(comtrada.showings[0]).toMatchObject({
      provider: "ComtradaCineOrder",
      providerFilmId: "film-comtrada",
      evidence: { productionYear: 2003 },
    });
  } finally {
    request.mockRestore();
  }
});
