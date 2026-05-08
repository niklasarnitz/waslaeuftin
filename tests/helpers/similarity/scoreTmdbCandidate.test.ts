import { expect, test, describe } from "bun:test";
import { scoreTmdbCandidate } from "../../../src/helpers/similarity/scoreTmdbCandidate";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";

const createMockResult = (overrides: Partial<TmdbMovieSearchResult> = {}): TmdbMovieSearchResult => ({
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
            poster_path: "/poster.jpg"
        });
        const score = scoreTmdbCandidate("the matrix", result);
        expect(score).toBeGreaterThan(0.9);
    });

    test("boosts score for original_title match", () => {
        const result = createMockResult({
            title: "Die Matrix",
            original_title: "The Matrix",
            popularity: 150
        });
        const score = scoreTmdbCandidate("the matrix", result);
        expect(score).toBeGreaterThan(0.9);
    });

    test("penalizes result without a poster", () => {
        const unrelatedWithPoster = createMockResult({ title: "Unrelated", original_title: "Unrelated", poster_path: "/poster.jpg", popularity: 0 });
        const unrelatedWithoutPoster = createMockResult({ title: "Unrelated", original_title: "Unrelated", poster_path: null, popularity: 0 });

        const scoreWith = scoreTmdbCandidate("something else", unrelatedWithPoster);
        const scoreWithout = scoreTmdbCandidate("something else", unrelatedWithoutPoster);

        expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
    });

    test("poster penalty works as expected before clamping", () => {
        const resultWithPoster = createMockResult({ title: "The Fast and the Furious", poster_path: "/poster.jpg", popularity: 0 });
        const resultWithoutPoster = createMockResult({ title: "The Fast and the Furious", poster_path: null, popularity: 0 });

        const scoreWith = scoreTmdbCandidate("fast and furious", resultWithPoster);
        const scoreWithout = scoreTmdbCandidate("fast and furious", resultWithoutPoster);

        expect(scoreWith - scoreWithout).toBeCloseTo(0.2);
    });

    test("boosts score for year match", () => {
        const result = createMockResult({ title: "Inception", release_date: "2010-07-16" });
        const scoreWithYearMatch = scoreTmdbCandidate("inception 2010", result);
        const scoreWithoutYearMatch = scoreTmdbCandidate("inception 2011", result);

        expect(scoreWithYearMatch).toBeGreaterThan(scoreWithoutYearMatch);
    });

    test("boosts score for inclusion", () => {
        const result = createMockResult({ title: "Star Wars: Episode IV - A New Hope" });
        const score = scoreTmdbCandidate("star wars", result);

        expect(score).toBeGreaterThan(0.3);
    });

    test("low score for unrelated movie", () => {
        const result = createMockResult({ title: "Toy Story" });
        const score = scoreTmdbCandidate("the godfather", result);

        expect(score).toBeLessThan(0.3);
    });
});
