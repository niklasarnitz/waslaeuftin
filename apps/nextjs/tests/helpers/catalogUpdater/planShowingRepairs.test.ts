import { expect, test } from "bun:test";

import type {
  ShowingReviewDecision,
  ShowingReviewInput,
} from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";
import type { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import { planShowingRepairs } from "@waslaeuftin/helpers/catalogUpdater/planShowingRepairs";

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
