import { describe, expect, test } from "bun:test";

import { scoreTmdbCandidate } from "@waslaeuftin/helpers/similarity/scoreTmdbCandidate";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";

const createMockResult = (
  overrides: Partial<TmdbMovieSearchResult> = {},
): TmdbMovieSearchResult => ({
  id: 1,
  title: "Default Title",
  original_title: "Default Original Title",
  original_language: "en",
  overview: "Default Overview",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  release_date: "2023-01-01",
  popularity: 100,
  vote_average: 7.5,
  vote_count: 1000,
  adult: false,
  video: false,
  genre_ids: [28],
  ...overrides,
});

describe("scoreTmdbCandidate", () => {
  test("returns high score for exact match", () => {
    const result = createMockResult({
      title: "The Matrix",
      original_title: "The Matrix",
      release_date: "1999-03-31",
      popularity: 150,
      poster_path: "/poster.jpg",
    });
    const score = scoreTmdbCandidate("the matrix", result);
    expect(score).toBeGreaterThan(0.9);
  });

  test("boosts score for original_title match", () => {
    const result = createMockResult({
      title: "Die Matrix",
      original_title: "The Matrix",
      popularity: 150,
    });
    const score = scoreTmdbCandidate("the matrix", result);
    expect(score).toBeGreaterThan(0.9);
  });

  test("ranks the popular subtitled Terminator 2 above an obscure exact original title", () => {
    const correct = createMockResult({
      id: 280,
      title: "Terminator 2 - Tag der Abrechnung",
      original_title: "Terminator 2: Judgment Day",
      release_date: "1991-07-03",
      popularity: 34.9553,
    });
    const collision = createMockResult({
      id: 66664,
      title: "Contaminator",
      original_title: "Terminator 2",
      release_date: "1989-03-17",
      popularity: 1.1709,
    });

    expect(scoreTmdbCandidate("terminator 2", correct)).toBeGreaterThan(0.68);
    expect(scoreTmdbCandidate("terminator 2", correct)).toBeGreaterThan(
      scoreTmdbCandidate("terminator 2", collision),
    );
  });

  test("does not erase popularity differences between identical Vaterland titles", () => {
    const current = createMockResult({
      title: "Vaterland",
      original_title: "Ojczyzna",
      release_date: "2026-06-19",
      popularity: 9.024,
    });
    const old = createMockResult({
      title: "Vaterland",
      original_title: "Fatherland",
      release_date: "1994-11-26",
      popularity: 3.7638,
    });

    expect(scoreTmdbCandidate("vaterland", current)).toBeGreaterThan(
      scoreTmdbCandidate("vaterland", old),
    );
  });

  test("does not confuse a title prefix with a sequel or a longer word", () => {
    for (const title of ["Terminator 20", "Terminator 2: Judgment Day"]) {
      const result = createMockResult({ title, original_title: title });
      expect(scoreTmdbCandidate("terminator", result)).toBeLessThan(0.68);
    }
  });

  test("penalizes result without a poster", () => {
    const unrelatedWithPoster = createMockResult({
      title: "Unrelated",
      original_title: "Unrelated",
      poster_path: "/poster.jpg",
      popularity: 0,
    });
    const unrelatedWithoutPoster = createMockResult({
      title: "Unrelated",
      original_title: "Unrelated",
      poster_path: null,
      popularity: 0,
    });

    const scoreWith = scoreTmdbCandidate("something else", unrelatedWithPoster);
    const scoreWithout = scoreTmdbCandidate(
      "something else",
      unrelatedWithoutPoster,
    );

    expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
  });

  test("poster penalty works as expected before clamping", () => {
    const resultWithPoster = createMockResult({
      title: "The Fast and the Furious",
      poster_path: "/poster.jpg",
      popularity: 0,
    });
    const resultWithoutPoster = createMockResult({
      title: "The Fast and the Furious",
      poster_path: null,
      popularity: 0,
    });

    const scoreWith = scoreTmdbCandidate("fast and furious", resultWithPoster);
    const scoreWithout = scoreTmdbCandidate(
      "fast and furious",
      resultWithoutPoster,
    );

    expect(scoreWith - scoreWithout).toBeCloseTo(0.2);
  });

  test("honors an explicit release year even for a less popular older film", () => {
    const result = createMockResult({
      title: "Vaterland",
      original_title: "Fatherland",
      release_date: "1994-11-26",
      popularity: 0,
    });
    expect(scoreTmdbCandidate("vaterland", result, 1994)).toBeGreaterThan(0.68);
    expect(scoreTmdbCandidate("vaterland", result, 2026)).toBe(0);
    expect(
      scoreTmdbCandidate("vaterland", { ...result, release_date: null }, 2026),
    ).toBe(0);
  });

  test("does not treat a year in the actual movie title as a release year", () => {
    const result = createMockResult({
      title: "2001: Odyssee im Weltraum",
      original_title: "2001: A Space Odyssey",
      release_date: "1968-04-02",
    });
    expect(
      scoreTmdbCandidate("2001 odyssee im weltraum", result),
    ).toBeGreaterThan(0.68);
  });

  test("boosts score for inclusion", () => {
    const result = createMockResult({
      title: "Star Wars: Episode IV - A New Hope",
    });
    const score = scoreTmdbCandidate("star wars", result);

    expect(score).toBeGreaterThan(0.3);
  });

  test("low score for unrelated movie", () => {
    const result = createMockResult({ title: "Toy Story" });
    const score = scoreTmdbCandidate("the godfather", result);

    expect(score).toBeLessThan(0.3);
  });
});
