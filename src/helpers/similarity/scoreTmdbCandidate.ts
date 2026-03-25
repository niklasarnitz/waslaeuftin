import { clampScore } from "./clampScore";
import { extractYear } from "../titleNormalization/extractYear";
import { getDiceSimilarity } from "./getDiceSimilarity";
import { getTokenOverlapScore } from "./getTokenOverlapScore";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";
import { normalizeForComparison } from "../titleNormalization/normalizeForComparison";

export const scoreTmdbCandidate = (
    requestedNormalizedTitle: string,
    result: TmdbMovieSearchResult
) => {
    const candidateTitle = normalizeForComparison(result.title);
    const candidateOriginalTitle = normalizeForComparison(result.original_title);

    const titleDice = getDiceSimilarity(requestedNormalizedTitle, candidateTitle);
    const originalTitleDice = getDiceSimilarity(
        requestedNormalizedTitle,
        candidateOriginalTitle
    );
    const bestDice = Math.max(titleDice, originalTitleDice);

    const titleOverlap = getTokenOverlapScore(
        requestedNormalizedTitle,
        candidateTitle
    );
    const originalTitleOverlap = getTokenOverlapScore(
        requestedNormalizedTitle,
        candidateOriginalTitle
    );
    const bestTokenOverlap = Math.max(titleOverlap, originalTitleOverlap);

    const candidateForInclusion = titleDice >= originalTitleDice ? candidateTitle : candidateOriginalTitle;

    const inclusionBoost = candidateForInclusion.includes(requestedNormalizedTitle) ||
        requestedNormalizedTitle.includes(candidateForInclusion)
        ? 0.08
        : 0;

    const exactMatchBoost = requestedNormalizedTitle === candidateForInclusion ? 0.18 : 0;

    const requestedYear = extractYear(requestedNormalizedTitle);
    const releaseYear = extractYear(result.release_date ?? "");
    const releaseYearBoost = requestedYear && releaseYear && requestedYear === releaseYear ? 0.06 : 0;

    const popularityBoost = Math.min(result.popularity / 150, 1) * 0.06;
    const posterPenalty = result.poster_path ? 0 : -0.2;

    const score = 0.58 * bestDice +
        0.28 * bestTokenOverlap +
        inclusionBoost +
        exactMatchBoost +
        releaseYearBoost +
        popularityBoost +
        posterPenalty;

    return clampScore(score);
};
