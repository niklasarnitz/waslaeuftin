import { expect, test } from "bun:test";

import type {
  ShowingReviewDecision,
  ShowingReviewInput,
} from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";
import type { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import {
  planBoundShowingRepairs,
  planShowingRepairs,
} from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";

const showing = (
  id: number,
  title: string,
  cinemaId = 10,
): ShowingReviewInput => ({
  id,
  rawMovieName: title,
  cinemaId,
  movieId: 1,
  dateTime: new Date("2026-12-01T18:00:00Z"),
});
const decision = (
  title: string,
  tmdbId: number | null,
  releaseDate = "2026-01-01",
  reason: NonNullable<TmdbMatchEvaluation["decisionReason"]> = "matched",
): ShowingReviewDecision => ({
  evaluation: {
    requestedTitle: title,
    normalizedTitle: title,
    threshold: 0.68,
    bestCandidate: null,
    acceptedCandidate: tmdbId
      ? {
          tmdbMovieId: tmdbId,
          title: "Vaterland",
          originalTitle: "Vaterland",
          posterPath: "/poster.jpg",
          releaseDate,
          popularity: 0,
          confidence: 0.95,
          sourceQuery: title,
        }
      : null,
    decisionReason: reason,
  },
});
const movies = [
  { id: 1, tmdbMovieId: 11248 },
  { id: 2, tmdbMovieId: 1437696 },
];

test("plans each raw showing independently, preserving explicit old versions and holding ambiguous/unevaluated titles", () => {
  const showings = [
    showing(1, "Vaterland (2026)"),
    showing(2, "Vaterland (1994)", 11),
    showing(3, "Vaterland", 12),
    showing(4, "Another film", 13),
    showing(5, "OV Sneak", 14),
  ];
  const decisions = new Map<number, ShowingReviewDecision>([
    [1, decision("Vaterland (2026)", 1437696)],
    [2, decision("Vaterland (1994)", 1437696)],
    [3, decision("Vaterland", null, "", "ambiguous")],
  ]);
  const rows = planShowingRepairs(showings, movies, decisions, []);
  expect(rows.map((row) => [row.showingId, row.status, row.reason])).toEqual([
    [1, "proposed-remap", "review-required"],
    [2, "held", "explicit-year-conflict"],
    [3, "held", "ambiguous"],
    [4, "unevaluated", "evaluation-limit"],
    [5, "proposed-detach", "unannounced-screening"],
  ]);
  expect(rows[0]).toMatchObject({
    sourceMovieId: 1,
    targetMovieId: 2,
    proposedTmdbId: 1437696,
  });
  expect(rows[4]).toMatchObject({ targetMovieId: null, proposedTmdbId: null });
});

test("holds existing and competing proposed target-slot collisions rather than deleting or merging", () => {
  const source = showing(1, "Vaterland (2026)");
  const decisions = new Map<number, ShowingReviewDecision>([
    [1, decision(source.rawMovieName, 1437696)],
    [2, decision(source.rawMovieName, 1437696)],
  ]);
  expect(
    planShowingRepairs([source], movies, decisions, [
      { cinemaId: 10, movieId: 2, dateTime: source.dateTime },
    ])[0],
  ).toMatchObject({ status: "held", reason: "duplicate-target-slot" });
  const rows = planShowingRepairs(
    [source, { ...source, id: 2, movieId: 3 }],
    [...movies, { id: 3, tmdbMovieId: 87516 }],
    decisions,
    [],
  );
  expect(rows.map((row) => row.reason)).toEqual([
    "proposed-slot-collision",
    "proposed-slot-collision",
  ]);
});

test("holds inconsistent provider years, API errors, missing targets and mismatched source decisions", () => {
  const sources = [
    showing(1, "Vaterland (1994)"),
    showing(2, "Vaterland", 11),
    showing(3, "Unstored film", 12),
    showing(4, "Another film", 13),
  ];
  sources[0]!.evidence = { productionYear: 2026 };
  const decisions = new Map<number, ShowingReviewDecision>([
    [1, decision(sources[0]!.rawMovieName, 1437696)],
    [2, { error: "TMDB unavailable" }],
    [3, decision("Unstored film", 900000)],
    [4, decision("Wrong source", 1437696)],
  ]);
  const rows = planShowingRepairs(sources, movies, decisions, []);
  expect(rows.map((row) => row.status)).toEqual([
    "held",
    "held",
    "held",
    "held",
  ]);
  expect(rows.map((row) => row.reason)).toEqual([
    "explicit-year-conflict",
    "TMDB unavailable",
    "target-not-stored",
    "source-title-conflict",
  ]);
});

const boundInput = (): Parameters<typeof planBoundShowingRepairs>[0] => {
  const updatedAt = new Date("2026-11-01T12:00:00Z");
  return {
    capturedAt: new Date("2026-11-06T12:00:00Z"),
    requests: [
      { showingId: 1, sourceMovieId: 3, targetTmdbId: 1437696, updatedAt },
    ],
    showings: [
      {
        ...showing(1, "Vaterland"),
        movieId: 3,
        bookingUrl: "https://kinotickets.express/test/booking/123",
        providerSessionId: "",
        sourceProvider: null,
        providerFilmId: null,
        updatedAt,
        isListed: true,
        showingAdditionalData: ["OV"],
      },
    ],
    movies: [
      { id: 3, tmdbMovieId: null, coverUrl: null },
      {
        id: 2,
        tmdbMovieId: 1437696,
        coverUrl: "https://example.com/cover.jpg",
      },
    ],
    catalogs: [
      {
        movies: [],
        showings: [
          {
            cinemaId: 10,
            movieName: "Vaterland",
            dateTime: new Date("2026-12-01T18:00:00Z"),
            bookingUrl: "https://kinotickets.express/test/booking/123",
            provider: "KinoTicketsExpress",
            providerFilmId: "film-123",
            evidence: { productionYear: 2026 },
          },
        ],
      },
    ],
    occupiedSlots: [],
    evaluate: async (title: string) => {
      const result = decision(title, 1437696);
      if (!("evaluation" in result)) throw new Error("Missing fixture");
      return result.evaluation;
    },
  };
};

test("plans only explicitly selected unmatched showings using uniquely booking-bound fresh evidence", async () => {
  const input = boundInput();
  input.showings.push({ ...input.showings[0]!, id: 99 });
  const before = structuredClone(input.showings);
  input.evaluate = async (title, evidence) => {
    // A stale stored year would select the wrong film instead.
    const result = decision(
      title,
      evidence?.productionYear === 2026 ? 1437696 : null,
    );
    if (!("evaluation" in result)) throw new Error("Missing fixture");
    return result.evaluation;
  };
  const rows = await planBoundShowingRepairs(input);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    status: "proposed-remap",
    targetMovieId: 2,
    proposedTmdbId: 1437696,
    source: { providerFilmId: "film-123", evidence: { productionYear: 2026 } },
    before: { id: 1, movieId: 3, showingAdditionalData: ["OV"] },
  });
  expect(input.showings).toEqual(before);
});

test.each([
  "booking",
  "time",
  "cinema",
  "title",
  "provider",
  "film",
  "session",
  "ambiguous-source",
  "empty-evidence",
  "changed-row",
  "positive-source",
  "wrong-target",
  "no-cover",
  "duplicate-target",
  "missing-row",
  "unlisted",
])("holds unsafe bounded repairs: %s", async (scenario) => {
  const input = boundInput();
  const stored = input.showings[0]!;
  const fresh = input.catalogs[0]!.showings[0]!;
  if (scenario === "booking") fresh.bookingUrl += "4";
  if (scenario === "time") fresh.dateTime = new Date("2026-12-01T19:00:00Z");
  if (scenario === "cinema") fresh.cinemaId = 11;
  if (scenario === "title") fresh.movieName = "Vaterland - Part Two";
  if (scenario === "provider") fresh.provider = "KinoHeld";
  if (scenario === "film")
    Object.assign(stored, { providerFilmId: "other-film" });
  if (scenario === "session") stored.providerSessionId = "other-session";
  if (scenario === "ambiguous-source")
    input.catalogs[0]!.showings.push({ ...fresh });
  if (scenario === "empty-evidence") fresh.evidence = {};
  if (scenario === "changed-row")
    stored.updatedAt = new Date("2026-11-02T12:00:00Z");
  if (scenario === "positive-source") input.movies[0]!.tmdbMovieId = 11248;
  if (scenario === "wrong-target") input.requests[0]!.targetTmdbId = 11248;
  if (scenario === "no-cover") input.movies[1]!.coverUrl = null;
  if (scenario === "duplicate-target")
    Object.assign(input, {
      occupiedSlots: [{ cinemaId: 10, movieId: 2, dateTime: stored.dateTime }],
    });
  if (scenario === "missing-row") input.showings = [];
  if (scenario === "unlisted") stored.isListed = false;
  expect((await planBoundShowingRepairs(input))[0]?.status).toBe("held");
});
