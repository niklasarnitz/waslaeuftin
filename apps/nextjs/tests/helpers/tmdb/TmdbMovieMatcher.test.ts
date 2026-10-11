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

  test.each(["Sneak Over (OV)", "Sneak Over OV", "Sneak Over (2024)"])(
    "still matches a real film with Sneak in its name: %s",
    async (title) => {
      expect(
        (await evaluate(title, [movie(1187059, "Sneak Over", 2024)]))
          .acceptedCandidate?.tmdbMovieId,
      ).toBe(1187059);
    },
  );

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
    ["Moscas - Fliegen und andere Gäste", movie(1437703, "Moscas", 2026)],
    ["Into the Wild - In die Wildnis", movie(5915, "Into the Wild", 2007)],
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
