import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import type { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";
import { auditedSneakTitles } from "@waslaeuftin/tests/fixtures/auditedSneakTitles";

mock.module("@waslaeuftin/env", () => ({
  env: { TMDB_API_KEY: "test", TMDB_MIN_CONFIDENCE_SCORE: 0.68 },
}));
const { TmdbMovieMatcher } =
  await import("@waslaeuftin/helpers/tmdb/TmdbMovieMatcher");

const movie = (
  id: number,
  title: string,
  year: number,
  originalTitle = title,
  popularity = 1,
): TmdbMovieSearchResult => ({
  id,
  title,
  original_title: originalTitle,
  release_date: `${year}-01-01`,
  popularity,
  original_language: "de",
  overview: null,
  poster_path: "/poster.jpg",
  backdrop_path: null,
  vote_average: 0,
  vote_count: 0,
  adult: false,
  video: false,
  genre_ids: [],
});

let restoreFetch: (() => void) | undefined;
const mockTmdb = (respond: (url: URL) => Response) => {
  restoreFetch?.();
  const implementation = Object.assign(
    async (input: RequestInfo | URL) => respond(new URL(String(input))),
    { preconnect: globalThis.fetch.preconnect },
  );
  const spy = spyOn(globalThis, "fetch").mockImplementation(implementation);
  restoreFetch = () => spy.mockRestore();
};
const evaluate = async (title: string, candidates: TmdbMovieSearchResult[]) => {
  mockTmdb((url) =>
    Response.json(
      url.pathname.endsWith("/alternative_titles")
        ? { titles: [] }
        : { results: candidates },
    ),
  );
  return new TmdbMovieMatcher().evaluate(title);
};

afterEach(() => restoreFetch?.());

describe("TmdbMovieMatcher audited cinema titles", () => {
  test.each([
    {
      title: "Vaiana",
      originalTitle: "Moana",
      director: "Thomas Kail",
      productionYear: 2002,
      releaseYear: 2026,
      date: "2026-07-09",
      runtime: 115,
      id: 1108427,
    },
    {
      title: "Vaiana",
      tmdbTitle: "Vaiana - Realverfilmung",
      originalTitle: "Moana",
      director: "Thomas Kail",
      productionYear: 2002,
      releaseYear: 2026,
      date: "2026-07-09",
      runtime: 115,
      id: 1108427,
    },
    {
      title: "Edmund und Luzie - Winterabenteuer",
      originalTitle: "L'Hiver d'Edmond et Lucy",
      director: "François Narboux",
      productionYear: 2026,
      releaseYear: 2023,
      date: "2026-10-22",
      runtime: 45,
      id: 1202205,
    },
  ])(
    "requires independently recorded German theatrical date and complete identity for $title",
    async (film) => {
      let country = "DE";
      let type = 3;
      let recordedDate: string = film.date;
      let knownRuntime = true;
      let ambiguous = false;
      let recordedAlias = true;
      mockTmdb((url) => {
        if (url.pathname.endsWith("/alternative_titles"))
          return Response.json({
            titles: recordedAlias ? [{ title: film.title }] : [],
          });
        if (url.pathname.startsWith("/3/person/"))
          return Response.json({ id: 1, also_known_as: [] });
        if (url.pathname.startsWith("/3/movie/"))
          return Response.json({
            runtime:
              knownRuntime &&
              (film.id !== 1202205 ||
                url.searchParams.get("language") === "de-DE")
                ? film.runtime
                : 0,
            credits: {
              crew: [{ id: 1, name: film.director, job: "Director" }],
            },
            release_dates: {
              results: [
                {
                  iso_3166_1: country,
                  release_dates: [
                    {
                      type,
                      release_date: `${url.pathname.endsWith("/99") ? "1995-01-01" : recordedDate}T00:00:00.000Z`,
                    },
                  ],
                },
              ],
            },
          });
        // A production-year-filtered search cannot discover the correct film.
        return Response.json({
          results: url.searchParams.has("year")
            ? []
            : [
                movie(
                  film.id,
                  film.tmdbTitle ?? film.title,
                  film.releaseYear,
                  film.originalTitle,
                ),
                movie(99, film.title, 1995, film.originalTitle),
                ...(ambiguous
                  ? [
                      movie(
                        100,
                        film.tmdbTitle ?? film.title,
                        film.releaseYear,
                        film.originalTitle,
                      ),
                    ]
                  : []),
              ],
        });
      });
      const evidence = {
        productionYear: film.productionYear,
        originalTitle: film.originalTitle,
        director: film.director,
        runtimeMinutes: film.runtime,
        germanTheatricalReleaseDate: film.date,
      };
      const matcher = new TmdbMovieMatcher();
      expect(
        (await matcher.evaluate(film.title, evidence)).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(film.id);
      if (film.tmdbTitle) {
        recordedAlias = false;
        expect(
          (await new TmdbMovieMatcher().evaluate(film.title, evidence))
            .acceptedCandidate,
        ).toBeNull();
        recordedAlias = true;
      }
      for (const changed of [
        { germanTheatricalReleaseDate: undefined },
        { germanTheatricalReleaseDate: "2026-07-10" },
        { originalTitle: "Another Original" },
        { director: undefined },
        { director: "Another Director" },
        { runtimeMinutes: undefined },
        { runtimeMinutes: film.runtime + 6 },
      ])
        expect(
          (await matcher.evaluate(film.title, { ...evidence, ...changed }))
            .acceptedCandidate,
        ).toBeNull();
      expect(
        (
          await matcher.evaluate(
            `${film.title} (${film.productionYear})`,
            evidence,
          )
        ).acceptedCandidate,
      ).toBeNull();
      for (const invalid of [
        "foreign",
        "digital",
        "premiere",
        "wrong-date",
        "unknown-runtime",
        "ambiguous",
      ]) {
        country = invalid === "foreign" ? "FR" : "DE";
        type = invalid === "digital" ? 4 : invalid === "premiere" ? 1 : 3;
        recordedDate = invalid === "wrong-date" ? "2026-10-23" : film.date;
        knownRuntime = invalid !== "unknown-runtime";
        ambiguous = invalid === "ambiguous";
        expect(
          (await new TmdbMovieMatcher().evaluate(film.title, evidence))
            .acceptedCandidate,
        ).toBeNull();
      }
    },
    30_000,
  );

  test("uses credited person aliases without guessing initials or dropping co-directors", async () => {
    let unavailable = false;
    mockTmdb((url) => {
      if (url.pathname === "/3/person/4259335")
        return unavailable
          ? new Response("Unavailable", { status: 503 })
          : Response.json({
              id: 4259335,
              also_known_as: ["Krysianna B. Papadakis"],
            });
      if (url.pathname === "/3/person/4259336")
        return Response.json({ id: 4259336, also_known_as: [] });
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      return Response.json(
        url.pathname === "/3/movie/1518731"
          ? {
              runtime: 121,
              credits: {
                crew: [
                  { id: 4259335, name: "Krysianna Papadakis", job: "Director" },
                  { id: 4259336, name: "Stergios Dinopoulos", job: "Director" },
                ],
              },
              release_dates: {
                results: [{ release_dates: [{ release_date: "2025-08-27" }] }],
              },
            }
          : { results: [movie(1518731, "Bearcave", 2026)] },
      );
    });
    const matcher = new TmdbMovieMatcher();
    const evidence = {
      productionYear: 2025,
      runtimeMinutes: 121,
      director: "Krysianna B. Papadakis und Stergios Dinopoulos",
    };
    expect(
      (await matcher.evaluate("Bearcave (OmU)", evidence)).acceptedCandidate
        ?.tmdbMovieId,
    ).toBe(1518731);
    for (const director of [
      "Krysianna C. Papadakis und Stergios Dinopoulos",
      "Krysianna B. Papadakis und Another Director",
    ])
      expect(
        (await matcher.evaluate("Bearcave (OmU)", { ...evidence, director }))
          .acceptedCandidate,
      ).toBeNull();
    unavailable = true;
    await expect(
      new TmdbMovieMatcher().evaluate("Bearcave (OmU)", evidence),
    ).rejects.toThrow("TMDB person aliases failed (503)");
  });

  test("preserves alternative source director claims without bypassing ambiguity or other evidence", async () => {
    let ambiguous = false;
    mockTmdb((url) => {
      if (url.pathname.startsWith("/3/person/"))
        return Response.json({ id: 5125, also_known_as: ["Fatih Akın"] });
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      return Response.json(
        url.pathname.startsWith("/3/movie/")
          ? {
              runtime: 106,
              credits: {
                crew: [{ id: 5125, job: "Director", name: "Fatih Akin" }],
              },
            }
          : {
              results: [
                movie(1447206, "Geister", 2026),
                ...(ambiguous ? [movie(1447207, "Geister", 2026)] : []),
              ],
            },
      );
    });
    const matcher = new TmdbMovieMatcher();
    const evidence = {
      productionYear: 2026,
      runtimeMinutes: 105,
      director: "Fathi Akin",
    };
    expect(
      (await matcher.evaluate("Geister", evidence)).acceptedCandidate,
    ).toBeNull();
    const corroborated = { ...evidence, directorAlternatives: ["Fatih Akin"] };
    expect(
      (await matcher.evaluate("Geister", corroborated)).acceptedCandidate
        ?.tmdbMovieId,
    ).toBe(1447206);
    for (const conflicting of [
      { ...corroborated, directorAlternatives: ["Another Director"] },
      { ...corroborated, runtimeMinutes: 120 },
      { ...corroborated, productionYear: 2024 },
      { ...corroborated, originalTitle: "Another film" },
    ])
      expect(
        (await matcher.evaluate("Geister", conflicting)).acceptedCandidate,
      ).toBeNull();
    ambiguous = true;
    expect(
      (await new TmdbMovieMatcher().evaluate("Geister", corroborated))
        .acceptedCandidate,
    ).toBeNull();
  });

  test("matches transliterated Polish director credits without accepting a different director", async () => {
    mockTmdb((url) =>
      Response.json(
        url.pathname === "/3/movie/1299799"
          ? {
              runtime: 114,
              credits: {
                crew: [{ job: "Director", name: "Michał Kwieciński" }],
              },
            }
          : { results: [movie(1299799, "Chopin, Chopin!", 2025)] },
      ),
    );
    const matcher = new TmdbMovieMatcher();
    expect(
      (
        await matcher.evaluate("Chopin, Chopin!", {
          director: "Michal Kwiecinski",
          runtimeMinutes: 114,
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(1299799);
    expect(
      (
        await matcher.evaluate("Chopin, Chopin!", {
          director: "Another Director",
          runtimeMinutes: 114,
        })
      ).acceptedCandidate,
    ).toBeNull();
  });

  test.each([
    [558582, "First Cow", "First Cow", 2019, 2020, "Kelly Reichardt", 122],
    [
      1299799,
      "Chopin - Eine Sonate in Paris",
      "Chopin, Chopin!",
      2026,
      2025,
      "Michał Kwieciński",
      114,
    ],
  ] as const)(
    "corroborates a one-year production/release difference for native identity %s",
    async (
      id,
      title,
      originalTitle,
      productionYear,
      releaseYear,
      director,
      runtime,
    ) => {
      mockTmdb((url) => {
        if (url.pathname.endsWith("/alternative_titles"))
          return Response.json({ titles: [] });
        const candidate = movie(id, title, releaseYear, originalTitle);
        return Response.json(
          url.pathname === `/3/movie/${id}`
            ? {
                ...candidate,
                runtime,
                genres: [],
                credits: { crew: [{ job: "Director", name: director }] },
              }
            : { results: [candidate] },
        );
      });
      const matcher = new TmdbMovieMatcher();
      const evidence = {
        tmdbId: id,
        originalTitle,
        productionYear,
        director,
        runtimeMinutes: runtime,
      };
      expect(
        (await matcher.evaluate(title, evidence)).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(id);
      for (const contradictory of [
        { ...evidence, director: "Another Director" },
        { ...evidence, director: undefined },
        { ...evidence, runtimeMinutes: runtime + 6 },
        { ...evidence, runtimeMinutes: undefined },
        { ...evidence, productionYear: releaseYear - 2 },
        { ...evidence, tmdbId: undefined },
      ]) {
        expect(
          (await matcher.evaluate(title, contradictory)).acceptedCandidate,
        ).toBeNull();
      }
      expect(
        (await matcher.evaluate(`${title} (${productionYear})`, evidence))
          .acceptedCandidate,
      ).toBeNull();
    },
  );

  test.each([0, null])(
    "does not reject a corroborated film when TMDB runtime is unknown (%s)",
    async (runtime) => {
      mockTmdb((url) =>
        Response.json(
          url.pathname === "/3/movie/1525072"
            ? {
                runtime,
                credits: {
                  crew: [{ job: "Director", name: "Bora Dağtekin" }],
                },
              }
            : { results: [movie(1525072, "Der perfekte Urlaub", 2026)] },
        ),
      );
      const matcher = new TmdbMovieMatcher();
      expect(
        (
          await matcher.evaluate("Der perfekte Urlaub", {
            productionYear: 2026,
            runtimeMinutes: 125,
            director: "Bora Dagtekin",
          })
        ).acceptedCandidate?.tmdbMovieId,
      ).toBe(1525072);
      expect(
        (
          await matcher.evaluate("Der perfekte Urlaub", {
            productionYear: 2026,
            runtimeMinutes: 125,
            director: "Another Director",
          })
        ).acceptedCandidate,
      ).toBeNull();
    },
  );

  test.each([
    [1366, "Rocky", "Rocky", 1976, 114, 118, 120],
    [1477104, "Shaun", "Shaun", 2026, 80, 91, 81],
    [
      1477104,
      "Shaun das Schaf - Spuk im Kürbisfeld",
      "Shaun the Sheep: The Beast of Mossy Bottom",
      2026,
      91,
      91,
      81,
    ],
  ] as const)(
    "corroborates runtime against default and regional metadata for %s",
    async (
      id,
      title,
      originalTitle,
      year,
      runtime,
      localRuntime,
      defaultRuntime,
    ) => {
      mockTmdb((url) =>
        Response.json(
          url.pathname.endsWith("/alternative_titles")
            ? { titles: [] }
            : url.pathname === `/3/movie/${id}`
              ? {
                  ...movie(id, title, year, originalTitle),
                  genres: [],
                  runtime:
                    url.searchParams.get("language") === "de-DE"
                      ? localRuntime
                      : defaultRuntime,
                }
              : { results: [movie(id, title, year, originalTitle)] },
        ),
      );
      const matcher = new TmdbMovieMatcher();
      expect(
        (await matcher.evaluate(title, { runtimeMinutes: runtime }))
          .acceptedCandidate?.tmdbMovieId,
      ).toBe(id);
      expect(
        (
          await new TmdbMovieMatcher().evaluate(title, {
            tmdbId: id,
            runtimeMinutes: runtime,
          })
        ).acceptedCandidate?.tmdbMovieId,
      ).toBe(id);
      expect(
        (
          await matcher.evaluate(title, {
            runtimeMinutes: Math.max(localRuntime, defaultRuntime) + 6,
          })
        ).acceptedCandidate,
      ).toBeNull();
    },
  );

  test("uses explicit extended-cut evidence without ignoring ordinary runtime or identity conflicts", async () => {
    const title = "Der Herr der Ringe - Die Gefährten";
    const originalTitle = "The Lord of the Rings: The Fellowship of the Ring";
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      return Response.json(
        url.pathname === "/3/movie/120"
          ? {
              runtime: 179,
              credits: { crew: [{ job: "Director", name: "Peter Jackson" }] },
            }
          : { results: [movie(120, title, 2001, originalTitle)] },
      );
    });
    const matcher = new TmdbMovieMatcher();
    const evidence = { originalTitle, runtimeMinutes: 227 };
    expect(
      (await matcher.evaluate(title, { ...evidence, edition: "extended" }))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(120);
    expect(
      (await matcher.evaluate(`${title} (Extended Version)`, evidence))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(120);
    for (const contradictory of [
      evidence,
      { ...evidence, edition: "extended" as const, runtimeMinutes: 120 },
      { ...evidence, edition: "extended" as const, originalTitle: undefined },
      {
        ...evidence,
        edition: "extended" as const,
        director: "Another Director",
      },
      {
        ...evidence,
        edition: "extended" as const,
        originalTitle: "The Lord of the Rings: The Two Towers",
      },
    ]) {
      expect(
        (await matcher.evaluate(title, contradictory)).acceptedCandidate,
      ).toBeNull();
    }
  }, 15_000);

  test("complete titles, year and director cannot override an unexplained runtime conflict", async () => {
    const title = "Die Tribute von Panem: The Ballad of Songbirds and Snakes";
    const originalTitle = "The Hunger Games: The Ballad of Songbirds & Snakes";
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? { titles: [] }
          : url.pathname === "/3/movie/695721"
            ? {
                runtime: 157,
                credits: {
                  crew: [{ job: "Director", name: "Francis Lawrence" }],
                },
              }
            : { results: [movie(695721, title, 2023, originalTitle)] },
      ),
    );
    const matcher = new TmdbMovieMatcher();
    const evidence = {
      originalTitle,
      productionYear: 2023,
      director: "Francis Lawrence",
      runtimeMinutes: 165,
    };
    expect(
      (await matcher.evaluate(title, evidence)).acceptedCandidate,
    ).toBeNull();
    expect(
      (await matcher.evaluate(title, { ...evidence, runtimeMinutes: 10 }))
        .acceptedCandidate,
    ).toBeNull();
    expect(
      (await matcher.evaluate(title, { ...evidence, runtimeMinutes: 162 }))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(695721);
    expect(
      (await matcher.evaluate(title, { ...evidence, runtimeMinutes: 163 }))
        .acceptedCandidate,
    ).toBeNull();
    for (const incompleteOrConflicting of [
      { ...evidence, originalTitle: undefined },
      { ...evidence, productionYear: undefined },
      { ...evidence, director: undefined },
      {
        ...evidence,
        originalTitle: "The Hunger Games: Sunrise on the Reaping",
      },
      { ...evidence, productionYear: 2022 },
      { ...evidence, director: "Different Director" },
    ]) {
      expect(
        (await matcher.evaluate(title, incompleteOrConflicting))
          .acceptedCandidate,
      ).toBeNull();
    }
    expect(
      (await matcher.evaluate("Unlisted translation", evidence))
        .acceptedCandidate,
    ).toBeNull();
  }, 15_000);

  test("missing director credits neither contradict a film nor corroborate a year mismatch or ambiguity", async () => {
    const title = "Stray Kids World Tour 'RUN IT' LIVE VIEWING";
    let director: string | undefined;
    let ambiguous = false;
    mockTmdb((url) => {
      const candidate = movie(1795555, title, 2026);
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname.startsWith("/3/movie/"))
        return Response.json({
          ...candidate,
          genres: [],
          runtime: 195,
          credits: {
            crew: director ? [{ job: "Director", name: director }] : [],
          },
        });
      return Response.json({
        results: ambiguous
          ? [candidate, movie(1795556, title, 2026)]
          : [candidate],
      });
    });
    const evidence = {
      originalTitle: title,
      director: "JYP Entertainment",
      runtimeMinutes: 195,
    };
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence)).acceptedCandidate
        ?.tmdbMovieId,
    ).toBe(1795555);
    expect(
      (
        await new TmdbMovieMatcher().evaluate(title, {
          ...evidence,
          tmdbId: 1795555,
          productionYear: 2025,
        })
      ).acceptedCandidate,
    ).toBeNull();
    director = "Different Director";
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence))
        .acceptedCandidate,
    ).toBeNull();
    director = undefined;
    ambiguous = true;
    const result = await new TmdbMovieMatcher().evaluate(title, evidence);
    expect(result.acceptedCandidate).toBeNull();
    expect(result.decisionReason).toBe("ambiguous");
  });

  test("does not mislabel a rejected film as a missing poster on an unrelated candidate", async () => {
    const title = "Der Herr der Ringe - Die Gefährten";
    const originalTitle = "The Lord of the Rings: The Fellowship of the Ring";
    mockTmdb((url) =>
      Response.json(
        url.pathname === "/3/movie/120"
          ? { runtime: 179 }
          : url.pathname.endsWith("/alternative_titles")
            ? { titles: [] }
            : {
                results: [
                  movie(120, title, 2001, originalTitle),
                  {
                    ...movie(1434460, "Herr der Ringe", 2025),
                    poster_path: null,
                  },
                ],
              },
      ),
    );
    const result = await new TmdbMovieMatcher().evaluate(title, {
      originalTitle,
      runtimeMinutes: 227,
    });
    expect(result.acceptedCandidate).toBeNull();
    expect(result.decisionReason).toBe("identity-evidence-conflict");
  });

  test("director evidence disambiguates Emil without an unreliable provider year", async () => {
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname.startsWith("/3/movie/")) {
        const current = url.pathname === "/3/movie/1426805";
        return Response.json({
          runtime: current ? 101 : 111,
          credits: {
            crew: [
              {
                job: "Director",
                name: current ? "David Dietl" : "Franziska Buch",
              },
            ],
          },
        });
      }
      return Response.json({
        results: [
          movie(10556, "Emil und die Detektive", 2001, undefined, 150),
          movie(1426805, "Emil und die Detektive", 2026),
        ],
      });
    });
    expect(
      (
        await new TmdbMovieMatcher().evaluate("Emil und die Detektive", {
          originalTitle: "Emil und die Detektive",
          runtimeMinutes: 96,
          director: "David Dietl",
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(1426805);
  });

  test("native TMDB IDs select a candidate without bypassing identity evidence or reusing another ID's cache", async () => {
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      const id = Number(url.pathname.split("/").at(-1));
      return Response.json({
        ...movie(id, "Signal", id === 95 ? 2007 : 2014),
        runtime: id === 97 ? 130 : 100,
        genres: [],
        credits: {
          crew: [{ name: "The Director", job: "Director" }],
          cast: [],
        },
      });
    });
    const matcher = new TmdbMovieMatcher();
    const evidence = {
      productionYear: 2007,
      director: "The Director",
      runtimeMinutes: 100,
    };
    expect(
      (await matcher.evaluate("Signal", { ...evidence, tmdbId: 95 }))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(95);
    expect(
      (await matcher.evaluate("Signal", { ...evidence, tmdbId: 96 }))
        .acceptedCandidate,
    ).toBeNull();
    expect(
      (await matcher.evaluate("Signal", { tmdbId: 97, runtimeMinutes: 100 }))
        .acceptedCandidate,
    ).toBeNull();
    expect(
      (
        await matcher.evaluate("Signal", {
          tmdbId: 95,
          director: "Another Director",
        })
      ).acceptedCandidate,
    ).toBeNull();
    // Explicit IDs do not reveal unnamed Sneaks or turn programmes into one film.
    expect(
      (await matcher.evaluate("Sneak Preview", { tmdbId: 95 }))
        .acceptedCandidate,
    ).toBeNull();
  });

  test.each([
    ["Alien: Covenant", movie(348, "Alien", 1979)],
    ["Halloween: Resurrection", movie(948, "Halloween", 1978)],
  ] as const)(
    "does not accept an unsubtitled original for a named installment: %s",
    async (title, wrong) => {
      expect((await evaluate(title, [wrong])).acceptedCandidate).toBeNull();
    },
  );

  test("original-title evidence cannot erase a raw-title installment", async () => {
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? { titles: [] }
          : { results: [movie(438631, "Dune", 2021)] },
      ),
    );
    const result = await new TmdbMovieMatcher().evaluate("Dune: Part Two", {
      originalTitle: "Dune",
    });
    expect(result.acceptedCandidate).toBeNull();
    expect(result.rejectedCandidates).toEqual([
      expect.objectContaining({ tmdbMovieId: 438631, titleConflict: true }),
    ]);
  });

  test("matches an original-language title without requiring a lexical translation", async () => {
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? { titles: [] }
          : { results: [movie(670, "Oldboy", 2003, "올드보이")] },
      ),
    );
    expect(
      (
        await new TmdbMovieMatcher().evaluate("Unlisted German translation", {
          originalTitle: "올드보이",
          productionYear: 2003,
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(670);
  });

  test("an official trailer resolves conflicting runtime only with complete titles and a known matching director", async () => {
    let official = true;
    let type = "Trailer";
    let site = "YouTube";
    let knownDirector = true;
    let ambiguous = false;
    let unavailable = false;
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (/^\/3\/movie\/\d+$/.test(url.pathname)) {
        if (unavailable && url.searchParams.get("language") === "de-DE")
          return new Response("Unavailable", { status: 503 });
        return Response.json({
          runtime: 129,
          credits: {
            crew: knownDirector
              ? [{ job: "Director", name: "Alejandro G. Iñárritu" }]
              : [],
          },
          videos: {
            results:
              url.searchParams.get("language") === "de-DE"
                ? [{ key: "qU-7KUMw-tk", site, type, official }]
                : [],
          },
        });
      }
      return Response.json({
        results: [
          movie(1248832, "Digger", 2026),
          ...(ambiguous ? [movie(1248833, "Digger", 2026)] : []),
        ],
      });
    });
    const evidence = {
      originalTitle: "Digger",
      director: "Alejandro G. Iñárritu",
      runtimeMinutes: 106,
      youtubeTrailerIds: ["qU-7KUMw-tk"],
    };
    const matcher = new TmdbMovieMatcher();
    expect(
      (await matcher.evaluate("Digger", evidence)).acceptedCandidate
        ?.tmdbMovieId,
    ).toBe(1248832);
    for (const conflicting of [
      { ...evidence, youtubeTrailerIds: undefined },
      { ...evidence, youtubeTrailerIds: ["OHGIHaDxYy8"] },
      { ...evidence, originalTitle: undefined },
      { ...evidence, originalTitle: "Another film" },
      { ...evidence, director: undefined },
      { ...evidence, director: "Georgis Grigorakis" },
      { ...evidence, director: "Alejandro G. Iñárritu / Another Director" },
      { ...evidence, productionYear: 2025 },
    ]) {
      expect(
        (await matcher.evaluate("Digger", conflicting)).acceptedCandidate,
      ).toBeNull();
    }
    expect(
      (await matcher.evaluate("Digger 2", evidence)).acceptedCandidate,
    ).toBeNull();
    expect(
      (await matcher.evaluate("Digger: Another film", evidence))
        .acceptedCandidate,
    ).toBeNull();
    official = false;
    expect(
      (await new TmdbMovieMatcher().evaluate("Digger", evidence))
        .acceptedCandidate,
    ).toBeNull();
    official = true;
    type = "Clip";
    expect(
      (await new TmdbMovieMatcher().evaluate("Digger", evidence))
        .acceptedCandidate,
    ).toBeNull();
    type = "Trailer";
    site = "Vimeo";
    expect(
      (await new TmdbMovieMatcher().evaluate("Digger", evidence))
        .acceptedCandidate,
    ).toBeNull();
    site = "YouTube";
    knownDirector = false;
    expect(
      (await new TmdbMovieMatcher().evaluate("Digger", evidence))
        .acceptedCandidate,
    ).toBeNull();
    knownDirector = true;
    ambiguous = true;
    expect(
      (await new TmdbMovieMatcher().evaluate("Digger", evidence))
        .decisionReason,
    ).toBe("ambiguous");
    ambiguous = false;
    unavailable = true;
    await expect(
      new TmdbMovieMatcher().evaluate("Digger", evidence),
    ).rejects.toThrow("TMDB identity details failed (503)");
  }, 30_000);

  test.each([false, true])(
    "retains regional official trailer corroboration with native ID: %s",
    async (native) => {
      const title = "Emil und die Detektive";
      const candidate = movie(1426805, title, 2026);
      let official = true;
      mockTmdb((url) => {
        if (url.pathname.endsWith("/alternative_titles"))
          return Response.json({ titles: [] });
        if (url.pathname.startsWith("/3/movie/"))
          return Response.json({
            ...candidate,
            genres: [],
            runtime: url.searchParams.get("language") === "de-DE" ? 100 : 101,
            credits: { crew: [{ job: "Director", name: "David Dietl" }] },
            videos: {
              results:
                url.searchParams.get("language") === "de-DE" &&
                url.searchParams
                  .get("append_to_response")
                  ?.split(",")
                  .includes("videos")
                  ? [
                      {
                        key: "HCnFyyvkM5s",
                        site: "YouTube",
                        type: "Trailer",
                        official,
                      },
                    ]
                  : [],
            },
          });
        return Response.json({ results: [candidate] });
      });
      const evidence = {
        ...(native ? { tmdbId: candidate.id } : {}),
        originalTitle: title,
        director: "David Dietl",
        runtimeMinutes: 110,
        youtubeTrailerIds: ["HCnFyyvkM5s"],
      };
      const matcher = new TmdbMovieMatcher();
      expect(
        (await matcher.evaluate(title, evidence)).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(candidate.id);
      expect(
        (await matcher.evaluate(title, { ...evidence, youtubeTrailerIds: [] }))
          .acceptedCandidate,
      ).toBeNull();
      official = false;
      expect(
        (await new TmdbMovieMatcher().evaluate(title, evidence))
          .acceptedCandidate,
      ).toBeNull();
    },
  );

  test("a shared official trailer corroborates a working original title only with complete known identity", async () => {
    const title = "PAW Patrol: Der Dino Film";
    let official = true;
    let videoType = "Teaser";
    let videoSite = "YouTube";
    let knownDirector = true;
    let ambiguous = false;
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? { titles: [] }
          : url.pathname.startsWith("/3/movie/")
            ? {
                runtime: 88,
                credits: {
                  crew: knownDirector
                    ? [{ job: "Director", name: "Cal Brunker" }]
                    : [],
                },
                videos: {
                  results: [
                    {
                      site: videoSite,
                      key: "aHw4PuLCUIc",
                      type: videoType,
                      official,
                    },
                  ],
                },
              }
            : {
                results: [
                  movie(1185806, title, 2026, "PAW Patrol: The Dino Movie"),
                  ...(ambiguous
                    ? [
                        movie(
                          1185807,
                          title,
                          2026,
                          "PAW Patrol: The Dino Movie",
                        ),
                      ]
                    : []),
                ],
              },
      ),
    );
    const evidence = {
      originalTitle: "Paw Patrol 3",
      productionYear: 2026,
      director: "Cal Brunker",
      runtimeMinutes: 88,
      youtubeTrailerIds: ["aHw4PuLCUIc"],
    };
    const matcher = new TmdbMovieMatcher();
    expect(
      (await matcher.evaluate(title, evidence)).acceptedCandidate?.tmdbMovieId,
    ).toBe(1185806);
    for (const conflicting of [
      { ...evidence, youtubeTrailerIds: ["OHGIHaDxYy8"] },
      { ...evidence, director: "Different Director" },
      { ...evidence, director: "/" },
      { ...evidence, director: undefined },
      { ...evidence, productionYear: 2025 },
      { ...evidence, runtimeMinutes: 100 },
    ])
      expect(
        (await matcher.evaluate(title, conflicting)).acceptedCandidate,
      ).toBeNull();
    expect(
      (await matcher.evaluate("PAW Patrol: Der Kinofilm", evidence))
        .acceptedCandidate,
    ).toBeNull();
    official = false;
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence))
        .acceptedCandidate,
    ).toBeNull();
    official = true;
    videoType = "Clip";
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence))
        .acceptedCandidate,
    ).toBeNull();
    videoType = "Teaser";
    videoSite = "Vimeo";
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence))
        .acceptedCandidate,
    ).toBeNull();
    videoSite = "YouTube";
    knownDirector = false;
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence))
        .acceptedCandidate,
    ).toBeNull();
    knownDirector = true;
    ambiguous = true;
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence)).decisionReason,
    ).toBe("ambiguous");
  }, 30_000);

  test("corroborates a shortened numbered original title only with a full listing title and official alias", async () => {
    const title = "Morgen, Findus wird's was geben";
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? {
              titles: [{ title: "Pettson and Findus 3: Pettson's Promise" }],
            }
          : url.pathname === "/3/movie/39702"
            ? { runtime: 74 }
            : {
                results: [
                  movie(
                    39702,
                    "Morgen, Findus, wird's was geben",
                    2005,
                    "Pettson & Findus - Tomtemaskinen",
                  ),
                ],
              },
      ),
    );
    const matcher = new TmdbMovieMatcher();
    const evidence = {
      originalTitle: "PETTSON AND FINDUS III",
      runtimeMinutes: 77,
    };
    expect(
      (await matcher.evaluate(title, evidence)).acceptedCandidate?.tmdbMovieId,
    ).toBe(39702);
    for (const originalTitle of [
      "Pettson and Findus II",
      "Pettson and Findus",
    ]) {
      expect(
        (await matcher.evaluate(title, { ...evidence, originalTitle }))
          .acceptedCandidate,
      ).toBeNull();
    }
    expect(
      (await matcher.evaluate("Unlisted translation", evidence))
        .acceptedCandidate,
    ).toBeNull();
  });

  test("corroborates a production year with the first recorded release, not a later rerelease", async () => {
    let releaseYears = [2025, 2026];
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname === "/3/movie/1518731")
        return Response.json({
          runtime: 121,
          release_dates: {
            results: [
              {
                iso_3166_1: "IT",
                release_dates: releaseYears.map((year) => ({
                  release_date: `${year}-08-27T00:00:00.000Z`,
                })),
              },
            ],
          },
        });
      return Response.json({
        results:
          url.searchParams.get("year") === "2025"
            ? [
                movie(1518731, "Bearcave", 2026),
                movie(1175262, "Bearcave", 2023),
              ]
            : [],
      });
    });
    const evidence = { productionYear: 2025, runtimeMinutes: 121 };
    expect(
      (await new TmdbMovieMatcher().evaluate("Bearcave (OmU)", evidence))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(1518731);
    expect(
      (
        await new TmdbMovieMatcher().evaluate("Bearcave (OmU)", {
          ...evidence,
          runtimeMinutes: 127,
        })
      ).acceptedCandidate,
    ).toBeNull();
    expect(
      (await new TmdbMovieMatcher().evaluate("Bearcave (2025)", evidence))
        .acceptedCandidate,
    ).toBeNull();
    for (const years of [[2024, 2025, 2026], [2026], []]) {
      releaseYears = years;
      expect(
        (await new TmdbMovieMatcher().evaluate("Bearcave (OmU)", evidence))
          .acceptedCandidate,
      ).toBeNull();
    }
  });

  test("uses provider evidence and does not reuse another version's cached decision", async () => {
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname === "/3/movie/670")
        return Response.json({
          runtime: 120,
          credits: { crew: [{ job: "Director", name: "Park Chan-wook" }] },
        });
      if (url.pathname === "/3/movie/87516")
        return Response.json({
          runtime: 104,
          credits: { crew: [{ job: "Director", name: "Spike Lee" }] },
        });
      return Response.json({
        results: [movie(670, "Oldboy", 2003), movie(87516, "Oldboy", 2013)],
      });
    });
    const matcher = new TmdbMovieMatcher();
    expect(
      (await matcher.evaluate("Oldboy", { productionYear: 2003 }))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(670);
    expect(
      (await matcher.evaluate("Oldboy", { productionYear: 2013 }))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(87516);
    expect(
      (
        await matcher.evaluate("Oldboy", {
          director: "Spike Lee",
          runtimeMinutes: 104,
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(87516);
    expect(
      (
        await matcher.evaluate("Oldboy", {
          director: "Spike Lee",
          runtimeMinutes: 120,
        })
      ).acceptedCandidate,
    ).toBeNull();
    expect(
      (await matcher.evaluate("Oldboy (2003)", { productionYear: 2013 }))
        .acceptedCandidate,
    ).toBeNull();
  });

  test("official aliases cannot bypass director or runtime evidence", async () => {
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [{ title: "Official Alias" }] });
      if (url.pathname === "/3/movie/4000")
        return Response.json({
          runtime: 120,
          credits: { crew: [{ job: "Director", name: "Park Chan-wook" }] },
        });
      return Response.json({
        results: [movie(4000, "Translated Title", 2003, "원본")],
      });
    });
    const matcher = new TmdbMovieMatcher();
    expect(
      (
        await matcher.evaluate("Unlisted cinema title", {
          originalTitle: "Official Alias",
          runtimeMinutes: 125,
          director: "Park Chan-wook",
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(4000);
    expect(
      (
        await matcher.evaluate("Unlisted cinema title", {
          originalTitle: "Official Alias",
          runtimeMinutes: 126,
          director: "Park Chan-wook",
        })
      ).acceptedCandidate,
    ).toBeNull();
    expect(
      (
        await matcher.evaluate("Unlisted cinema title", {
          originalTitle: "Official Alias",
          runtimeMinutes: 120,
          director: "Spike Lee",
        })
      ).acceptedCandidate,
    ).toBeNull();
  });

  test("matches combined director credits and retains rejected candidate evidence", async () => {
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname === "/3/movie/4000")
        return Response.json({
          runtime: 117,
          credits: {
            crew: [
              { job: "Director", name: "Joel Coen" },
              { job: "Director", name: "Ethan Coen" },
            ],
          },
        });
      return Response.json({ results: [movie(4000, "Coen Film", 1998)] });
    });
    const matcher = new TmdbMovieMatcher();
    expect(
      (
        await matcher.evaluate("Coen Film", {
          director: "Joel Coen / Ethan Coen",
          runtimeMinutes: 117,
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(4000);
    const rejected = await matcher.evaluate("Coen Film", {
      director: "Joel Coen / Spike Lee",
      runtimeMinutes: 130,
    });
    expect(rejected.acceptedCandidate).toBeNull();
    expect(rejected.decisionReason).toBe("identity-evidence-conflict");
    expect(rejected.candidates).toEqual([
      expect.objectContaining({ tmdbMovieId: 4000, title: "Coen Film" }),
    ]);
    expect(rejected.rejectedCandidates).toEqual([
      {
        tmdbMovieId: 4000,
        directorConflict: true,
        runtimeConflict: true,
        observedDirectors: ["Joel Coen", "Ethan Coen"],
        observedRuntime: 117,
      },
    ]);
  });

  test.each([
    [
      "Ring (1998)",
      movie(2671, "Ring - Das Original", 1998, "リング"),
      movie(9706, "Ring - Spiral", 1998, "らせん", 150),
      "Ring",
    ],
    [
      "Into the Wild - In die Wildnis",
      movie(5915, "Into the Wild", 2007),
      movie(1217246, "Into the Wild", 2023, "Into the Wild", 150),
      "In die Wildnis - Allein nach Alaska",
    ],
  ] as const)(
    "uses official aliases to resolve ambiguous search results: %s",
    async (title, correct, wrong, alias) => {
      mockTmdb((url) =>
        Response.json(
          url.pathname.endsWith("/alternative_titles")
            ? {
                titles: url.pathname.includes(`/${correct.id}/`)
                  ? [{ title: alias }]
                  : [],
              }
            : { results: [wrong, correct] },
        ),
      );
      expect(
        (await new TmdbMovieMatcher().evaluate(title)).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(correct.id);
    },
  );

  test("does not guess which Moscas an unofficial translated subtitle refers to", async () => {
    expect(
      (
        await evaluate("Moscas - Fliegen und andere Gäste", [
          movie(1437703, "Moscas", 2026),
          movie(1177908, "Moscas", 2023),
        ])
      ).acceptedCandidate,
    ).toBeNull();
    expect(
      (
        await evaluate("Moscas - Fliegen und andere Gäste", [
          movie(1437703, "Moscas", 2026),
        ])
      ).acceptedCandidate,
    ).toBeNull();
  });

  test("does not infer a bilingual identity when official aliases are absent", async () => {
    expect(
      (
        await evaluate("Into the Wild - In die Wildnis", [
          movie(5915, "Into the Wild", 2007),
        ])
      ).acceptedCandidate,
    ).toBeNull();
  });

  test("recognizes a bilingual title using TMDB's primary and original titles", async () => {
    expect(
      (
        await evaluate(
          "Gruppo di famiglia in un interno - Gewalt und Leidenschaft",
          [
            movie(
              56142,
              "Gewalt und Leidenschaft",
              1974,
              "Gruppo di Famiglia in un Interno",
            ),
          ],
        )
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(56142);
  });

  test("source-backed official title aliases corroborate only complete matching identities", async () => {
    const title = "Gioia mia - Mein Sommer mit Nonna";
    let knownDirector = true;
    let ambiguous = false;
    let poster = true;
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      if (url.pathname.startsWith("/3/movie/"))
        return Response.json({
          runtime: 92,
          credits: {
            crew: knownDirector
              ? [{ job: "Director", name: "Margherita Spampinato" }]
              : [],
          },
        });
      return Response.json({
        results: [1510325, ...(ambiguous ? [1510326] : [])].map((id) => ({
          ...movie(id, "Mein Sommer bei Nonna", 2025, "Gioia mia"),
          poster_path: poster ? "/poster.jpg" : null,
        })),
      });
    });
    const alias = {
      title,
      originalTitle: "Gioia mia",
      director: "Margherita Spampinato",
      productionYear: 2025,
      runtimeMinutes: 90,
      sourceUrl:
        "https://www.cinema-italia.net/filme.php?selectedday=17&selectedfilm=3",
    };
    const evidence = {
      originalTitle: "Gioia mia",
      director: "Margherita Spampinato",
      productionYear: 2025,
      runtimeMinutes: 90,
    };
    const matcher = new TmdbMovieMatcher();
    expect(
      (await matcher.evaluate(title, evidence)).acceptedCandidate,
    ).toBeNull();
    expect(
      (
        await matcher.evaluate(title, {
          ...evidence,
          officialTitleAliases: [alias],
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(1510325);
    for (const changed of [
      { title: "An invented subtitle" },
      { originalTitle: "Another film" },
      { director: "Another Director" },
      { productionYear: 2024 },
      { runtimeMinutes: 120 },
    ])
      expect(
        (
          await matcher.evaluate(title, {
            ...evidence,
            officialTitleAliases: [{ ...alias, ...changed }],
          })
        ).acceptedCandidate,
      ).toBeNull();
    for (const changed of [
      { productionYear: 2024 },
      { director: "Another Director" },
      { runtimeMinutes: 120 },
      { originalTitle: "Another original" },
    ])
      expect(
        (
          await matcher.evaluate(title, {
            ...evidence,
            ...changed,
            officialTitleAliases: [alias],
          })
        ).acceptedCandidate,
      ).toBeNull();
    expect(
      (
        await matcher.evaluate("Gioia mia 2 - Mein Sommer mit Nonna", {
          ...evidence,
          officialTitleAliases: [alias],
        })
      ).acceptedCandidate,
    ).toBeNull();
    knownDirector = false;
    expect(
      (
        await new TmdbMovieMatcher().evaluate(title, {
          ...evidence,
          officialTitleAliases: [alias],
        })
      ).acceptedCandidate,
    ).toBeNull();
    knownDirector = true;
    ambiguous = true;
    expect(
      (
        await new TmdbMovieMatcher().evaluate(title, {
          ...evidence,
          officialTitleAliases: [alias],
        })
      ).decisionReason,
    ).toBe("ambiguous");
    ambiguous = false;
    poster = false;
    expect(
      (
        await new TmdbMovieMatcher().evaluate(title, {
          ...evidence,
          officialTitleAliases: [alias],
        })
      ).acceptedCandidate,
    ).toBeNull();
  }, 30_000);

  test("requires a recorded title translation rather than inferring it from identity metadata", async () => {
    let ambiguous = false;
    let recordedTranslation = false;
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? {
              titles: recordedTranslation
                ? [{ title: "Das Leben als Erwachsene" }]
                : [],
            }
          : /^\/3\/movie\/\d+$/.test(url.pathname)
            ? {
                runtime: 95,
                credits: { crew: [{ job: "Director", name: "Greta Scarano" }] },
              }
            : {
                results: [
                  movie(1421309, "La vita da grandi", 2025),
                  ...(ambiguous
                    ? [movie(1421310, "La vita da grandi", 2025)]
                    : []),
                ],
              },
      ),
    );
    const matcher = new TmdbMovieMatcher();
    const title = "La vita da grandi - Das Leben als Erwachsene";
    const evidence = {
      productionYear: 2025,
      runtimeMinutes: 95,
      director: "Greta Scarano",
    };
    expect(
      (await matcher.evaluate(title, evidence)).acceptedCandidate,
    ).toBeNull();
    recordedTranslation = true;
    const corroboratedMatcher = new TmdbMovieMatcher();
    expect(
      (await corroboratedMatcher.evaluate(title, evidence)).acceptedCandidate
        ?.tmdbMovieId,
    ).toBe(1421309);
    expect(
      (
        await corroboratedMatcher.evaluate(title, {
          ...evidence,
          runtimeMinutes: 100,
        })
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(1421309);
    for (const conflicting of [
      { ...evidence, productionYear: 2024 },
      { ...evidence, runtimeMinutes: 101 },
      { ...evidence, director: "Another Director" },
      { ...evidence, originalTitle: "Another film" },
    ]) {
      expect(
        (await corroboratedMatcher.evaluate(title, conflicting))
          .acceptedCandidate,
      ).toBeNull();
    }
    for (const unsupportedTitle of [
      "Another film - Das Leben als Erwachsene",
      "La vita da grandi 2 - Das Leben als Erwachsene",
      "La vita da grandi - Das Leben als Erwachsene 2",
    ]) {
      expect(
        (await corroboratedMatcher.evaluate(unsupportedTitle, evidence))
          .acceptedCandidate,
      ).toBeNull();
    }
    ambiguous = true;
    expect(
      (await new TmdbMovieMatcher().evaluate(title, evidence)).decisionReason,
    ).toBe("ambiguous");
  }, 15_000);

  test("does not discard a named installment despite complete metadata for its predecessor", async () => {
    mockTmdb((url) =>
      Response.json(
        url.pathname.endsWith("/alternative_titles")
          ? { titles: [] }
          : url.pathname.startsWith("/3/movie/")
            ? {
                runtime: 155,
                credits: {
                  crew: [{ job: "Director", name: "Denis Villeneuve" }],
                },
              }
            : { results: [movie(438631, "Dune", 2021)] },
      ),
    );
    const evidence = {
      originalTitle: "Dune",
      productionYear: 2021,
      director: "Denis Villeneuve",
      runtimeMinutes: 155,
    };
    const matcher = new TmdbMovieMatcher();
    expect(
      (await matcher.evaluate("Dune", evidence)).acceptedCandidate?.tmdbMovieId,
    ).toBe(438631);
    expect(
      (await matcher.evaluate("Dune - Messiah", evidence)).acceptedCandidate,
    ).toBeNull();
  });

  test.each([
    ["Triple 9", movie(146198, "Triple 9", 2016)],
    ["Marathon Man", movie(10518, "Der Marathon-Mann", 1976, "Marathon Man")],
  ] as const)(
    "does not mistake a movie title for a multi-film programme: %s",
    async (title, correct) => {
      expect(
        (await evaluate(title, [correct])).acceptedCandidate?.tmdbMovieId,
      ).toBe(correct.id);
    },
  );

  test.each([
    [
      "Der Herr der Ringe 1 (Extended Version) (25th Anniversary)",
      movie(
        120,
        "Der Herr der Ringe - Die Gefährten",
        2001,
        "The Lord of the Rings: The Fellowship of the Ring",
      ),
      "The Lord of the Rings I: The Fellowship of the Ring",
    ],
    [
      "Der Herr der Ringe 2 (Extended Version)",
      movie(
        121,
        "Der Herr der Ringe - Die zwei Türme",
        2002,
        "The Lord of the Rings: The Two Towers",
      ),
      "The Lord of the Rings 2: The Two Towers",
    ],
    [
      "Der Herr der Ringe 3 (Extended Version)",
      movie(
        122,
        "Der Herr der Ringe - Die Rückkehr des Königs",
        2003,
        "The Lord of the Rings: The Return of the King",
      ),
      "The Lord of the Rings III: The Return of the King",
    ],
  ] as const)(
    "uses official alternate titles to establish a localized franchise ordinal: %s",
    async (title, correct, alias) => {
      mockTmdb((url) => {
        if (url.pathname.endsWith("/alternative_titles")) {
          return Response.json({
            titles: url.pathname.includes(`/${correct.id}/`)
              ? [{ title: alias }]
              : [],
          });
        }
        return Response.json({
          results: [
            movie(123, "Der Herr der Ringe", 1978, "The Lord of the Rings"),
            correct,
          ],
        });
      });
      expect(
        (await new TmdbMovieMatcher().evaluate(title)).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(correct.id);
    },
  );

  test("retrieves the official Roman-numeral title when Arabic-number searches miss it", async () => {
    const correct = movie(
      11281,
      "Halloween II - Das Grauen kehrt zurück",
      1981,
      "Halloween II",
    );
    mockTmdb((url) => {
      if (url.pathname.endsWith("/alternative_titles"))
        return Response.json({ titles: [] });
      const query = url.searchParams.get("query")?.toLowerCase();
      return Response.json({
        results:
          query === "halloween ii - das grauen kehrt zurück"
            ? [correct]
            : [movie(1036064, "Once Halloween 2", 2019)],
      });
    });
    expect(
      (
        await new TmdbMovieMatcher().evaluate(
          "Halloween 2 - Das Grauen kehrt zurück",
        )
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(11281);
  });

  test.each(auditedSneakTitles)(
    "does not guess a movie for an unknown screening: %s",
    async (title) => {
      const result = await evaluate(title, [
        movie(1187059, "Sneak Over", 2024),
        movie(1220030, "All In Sneak Preview", 2024),
        movie(301325, "#Horror", 2015),
      ]);
      expect(result.acceptedCandidate).toBeNull();
      expect(result.bestCandidate).toBeNull();
    },
  );

  test("does not replace Dune with the more popular Part Two", async () => {
    const result = await evaluate("Dune (2021)", [
      movie(693134, "Dune: Part Two", 2024, "Dune: Part Two", 150),
      movie(438631, "Dune", 2021, "Dune", 25),
    ]);
    expect(result.acceptedCandidate?.tmdbMovieId).toBe(438631);
    const absent = await evaluate("Dune", [
      movie(693134, "Dune: Part Two", 2024, "Dune: Part Two", 150),
    ]);
    expect(absent.acceptedCandidate).toBeNull();
  });

  test("finds Frühstück bei Audrey without deleting its first title word", async () => {
    const result = await evaluate("Frühstück bei Audrey", [
      movie(1309396, "Frühstück bei Audrey", 2026, "La Poupée"),
    ]);
    expect(result.normalizedTitle).toBe("fruhstuck bei audrey");
    expect(result.acceptedCandidate?.tmdbMovieId).toBe(1309396);
  });

  test.each([
    [
      "When Harry Met Sally...",
      "when harry met sally",
      movie(639, "Harry und Sally", 1989, "When Harry Met Sally..."),
    ],
    ["Metropolis", "metropolis", movie(19, "Metropolis", 1927)],
  ] as const)(
    "does not confuse movie words with the MET performance brand: %s",
    async (title, normalized, correct) => {
      const result = await evaluate(title, [correct]);
      expect(result.normalizedTitle).toBe(normalized);
      expect(result.acceptedCandidate?.tmdbMovieId).toBe(correct.id);
    },
  );

  test.each([
    "Sneak Over (OV)",
    "Sneak Over OV",
    "Sneak Over (2024)",
    "  **Sneak   Over (OV) | CinemaxX**  ",
  ])("still matches a real film with Sneak in its name: %s", async (title) => {
    expect(
      (await evaluate(title, [movie(1187059, "Sneak Over", 2024)]))
        .acceptedCandidate?.tmdbMovieId,
    ).toBe(1187059);
  });

  test.each([
    [
      "Niko - Reise zu den Polarlichtern",
      movie(717196, "Niko - Reise zu den Polarlichtern", 2024),
      movie(1, "Niko - Ein Rentier hebt ab", 2008),
    ],
    [
      "Der Herr der Ringe - Die Gefährten",
      movie(120, "Der Herr der Ringe - Die Gefährten", 2001),
      movie(121, "Der Herr der Ringe - Die zwei Türme", 2002),
    ],
  ] as const)(
    "does not erase a named subtitle to choose another film in the series: %s",
    async (title, correct, wrong) => {
      expect(
        (await evaluate(title, [wrong, correct])).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(correct.id);
      expect((await evaluate(title, [wrong])).acceptedCandidate).toBeNull();
    },
  );

  test.each([
    ["올드보이 (2003)", movie(670, "Oldboy", 2003, "올드보이")],
    ["回路 (2001)", movie(27324, "Pulse", 2001, "回路")],
    [
      "2001: Odyssee im Weltraum",
      movie(62, "2001: Odyssee im Weltraum", 1968, "2001: A Space Odyssey"),
    ],
  ] as const)(
    "preserves original-script titles and numbers that belong to the title: %s",
    async (title, correct) => {
      expect(
        (await evaluate(title, [correct])).acceptedCandidate?.tmdbMovieId,
      ).toBe(correct.id);
    },
  );

  test.each([
    [
      "Festtagsspaß mit Peppa - Das Kinoerlebnis",
      movie(1650896, "Festtagsspaß mit Peppa", 2026),
    ],
    [
      "CineSpecial: Der Herr der Ringe - Die zwei Türme (Extended)",
      movie(121, "Der Herr der Ringe - Die zwei Türme", 2002),
    ],
    [
      "CineSpecial: Der Herr der Ringe - Die Rückkehr des Königs (Extended)",
      movie(122, "Der Herr der Ringe - Die Rückkehr des Königs", 2003),
    ],
    [
      "CineSpecial: Der Herr der Ringe - Die Gefährten (Extended)",
      movie(120, "Der Herr der Ringe - Die Gefährten", 2001),
    ],
    [
      "CineSpecial: Halloween - Die Nacht des Grauens (4K)",
      movie(948, "Halloween - Die Nacht des Grauens", 1978),
    ],
    [
      "FILMKUNST: Vaterland (2026)",
      movie(1437696, "Vaterland", 2026, "Ojczyzna"),
    ],
    [
      "V&K: Terminator 2: Tag der Abrechnung 35th Anniversary",
      movie(
        280,
        "Terminator 2 - Tag der Abrechnung",
        1991,
        "Terminator 2: Judgment Day",
      ),
    ],
    [
      "DER HERR DER RINGE - DIE GEFÄHRTEN - JUBILÄUM 25 JAHRE",
      movie(120, "Der Herr der Ringe - Die Gefährten", 2001),
    ],
    [
      "Dune: Part Three Early Fan Preview",
      movie(1170608, "Dune: Part Three", 2026),
    ],
    ["Dune: Part Three Vorpremiere", movie(1170608, "Dune: Part Three", 2026)],
  ] as const)(
    "matches a film behind cinema presentation labels: %s",
    async (title, correct) => {
      const result = await evaluate(title, [
        movie(717256, "Threading The Cine-Kodak Special", 1955),
        correct,
      ]);
      expect(result.acceptedCandidate?.tmdbMovieId).toBe(correct.id);
    },
  );

  test.each([
    [
      "Halloween 2 - Das Grauen kehrt zurück",
      movie(
        11281,
        "Halloween II - Das Grauen kehrt zurück",
        1981,
        "Halloween II",
      ),
      movie(24150, "Halloween II", 2009),
    ],
    [
      "Die Tribute von Panem 3 - Mockingjay Teil 1",
      movie(131631, "Die Tribute von Panem – Mockingjay Teil 1", 2014),
      movie(131634, "Die Tribute von Panem – Mockingjay Teil 2", 2015),
    ],
    [
      "NIKO 3 – REISE ZU DEN POLARLICHTERN",
      movie(717196, "Niko - Reise zu den Polarlichtern", 2024),
      movie(139146, "Niko 2 - Kleines Rentier, großer Held", 2012),
    ],
    [
      "Meine Freundin Conni 2 - Abenteuer mit Kranich Klaus",
      movie(
        1422407,
        "Meine Freundin Conni - Abenteuer Mit Kranich Klaus",
        2026,
        "Meine Freundin Conni 2",
      ),
      movie(682875, "Meine Freundin Conni - Geheimnis um Kater Mau", 2020),
    ],
  ] as const)(
    "resolves ordinal aliases without confusing installments: %s",
    async (title, correct, wrong) => {
      expect(
        (await evaluate(title, [wrong, correct])).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(correct.id);
      expect((await evaluate(title, [wrong])).acceptedCandidate).toBeNull();
    },
  );

  test.each([
    [
      "OLDBOY (2003)",
      movie(670, "Oldboy", 2003, "올드보이"),
      movie(87516, "Oldboy", 2013),
    ],
    [
      "Das Ding aus einer anderen Welt (1951)",
      movie(10785, "Das Ding aus einer anderen Welt", 1951),
      movie(1091, "Das Ding aus einer anderen Welt", 1982),
    ],
    [
      "Ring (1998)",
      movie(2671, "Ring - Das Original", 1998, "リング"),
      movie(565, "Ring", 2002),
    ],
    [
      "Pulse (2001)",
      movie(27324, "Pulse", 2001, "回路"),
      movie(9682, "Pulse", 2006),
    ],
    [
      "HEXEN HEXEN (1990)",
      movie(10166, "Hexen hexen", 1990),
      movie(531219, "Hexen hexen", 2020),
    ],
    ["HEIDI (1965)", movie(94995, "Heidi", 1965), movie(365045, "Heidi", 2015)],
    [
      "Emil und die Detektive (2026)",
      movie(1426805, "Emil und die Detektive", 2026),
      movie(10556, "Emil und die Detektive", 2001),
    ],
    [
      "Vaterland (2026)",
      movie(1437696, "Vaterland", 2026, "Ojczyzna"),
      movie(11248, "Vaterland", 1994, "Fatherland"),
    ],
  ] as const)(
    "uses the explicit year to disambiguate versions: %s",
    async (title, correct, wrong) => {
      expect(
        (await evaluate(title, [{ ...wrong, popularity: 150 }, correct]))
          .acceptedCandidate?.tmdbMovieId,
      ).toBe(correct.id);
      expect((await evaluate(title, [wrong])).acceptedCandidate).toBeNull();
    },
  );

  test("abstains from bare same-title remakes instead of guessing by popularity", async () => {
    for (const title of ["Emil und die Detektive", "Vaterland", "Dune"]) {
      const result = await evaluate(title, [
        movie(1, title, 1964, title, 150),
        movie(2, title, 2026),
      ]);
      expect(result.acceptedCandidate).toBeNull();
    }
    expect(
      (
        await evaluate("Dune", [
          movie(841, "Der Wüstenplanet", 1984, "Dune", 10),
          movie(438631, "Dune", 2021, "Dune", 40),
        ])
      ).acceptedCandidate,
    ).toBeNull();
    expect(
      (
        await evaluate("Terminator 2 (OV, 70mm)", [
          movie(66664, "Contaminator", 1989, "Terminator 2", 1.1709),
          movie(
            280,
            "Terminator 2 - Tag der Abrechnung",
            1991,
            "Terminator 2: Judgment Day",
            34.9553,
          ),
        ])
      ).acceptedCandidate?.tmdbMovieId,
    ).toBe(280);
  });

  test.each([
    [
      "RBO 2026/27: Manon (The Royal Ballet)",
      movie(
        1702757,
        "RBO 2026/27: Manon (The Royal Ballet)",
        2026,
        "Royal Ballet & Opera 2026/27: Manon",
      ),
      movie(671338, "Manon (The Royal Ballet)", 2018),
    ],
    [
      "RBO Live 2026-27: The Royal Opera Tosca",
      movie(1702784, "RBO 2026/27: Tosca (The Royal Opera)", 2027),
      movie(1011349, "The Royal Opera House: Madama Butterfly", 2022),
    ],
    [
      "MET Opera: Otello (2027)",
      movie(1703634, "The Metropolitan Opera 2026/27: Otello", 2027),
      movie(198469, "Otello", 1986),
    ],
    [
      "Met Opera: Manon (2027)",
      movie(1703631, "The Metropolitan Opera 2026/27: Manon", 2027),
      movie(504210, "Massenet: Manon", 2012),
    ],
  ] as const)(
    "retains production/season identity for event cinema: %s",
    async (title, correct, wrong) => {
      expect(
        (await evaluate(title, [wrong, correct])).acceptedCandidate
          ?.tmdbMovieId,
      ).toBe(correct.id);
      expect((await evaluate(title, [wrong])).acceptedCandidate).toBeNull();
    },
  );

  test.each([
    "The Royal Opera House: La Bohème",
    "Verdi: Otello",
    "  *Verdi: Otello* | CinemaxX  ",
    "  *Der Herr der Ringe Triple* | CinemaxX  ",
    "MET OPERA: Verdi OTELLO",
    "Massenet: Manon (MET live im Kino)",
    "Live aus der MET: Verdi: Otello",
    "Live aus der MET: Massenet: Manon",
    "Panem-Mockingjay 1+2",
    "Herr der Ringe Ext. Trilogie",
    "Der Herr der Ringe Triple (Extended Version)",
    "Die Tribute von Panem 1-4 (2D)",
    "Lord Of The Rings Triple (Extended Version - English)",
  ])(
    "does not replace an ambiguous production or multi-film programme with one film: %s",
    async (title) => {
      expect(
        (
          await evaluate(title, [
            movie(1011349, "The Royal Opera House: Madama Butterfly", 2022),
            movie(198469, "Otello", 1986),
            movie(123, "Der Herr der Ringe", 1978),
            movie(131631, "Die Tribute von Panem – Mockingjay Teil 1", 2014),
          ])
        ).acceptedCandidate,
      ).toBeNull();
    },
  );
});
