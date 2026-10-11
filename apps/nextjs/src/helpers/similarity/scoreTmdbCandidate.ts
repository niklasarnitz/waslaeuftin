import { extractYear, normalizeForComparison } from "@waslaeuftin/core";
import { clampScore } from "@waslaeuftin/helpers/similarity/clampScore";
import { getDiceSimilarity } from "@waslaeuftin/helpers/similarity/getDiceSimilarity";
import { getTokenOverlapScore } from "@waslaeuftin/helpers/similarity/getTokenOverlapScore";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";

export const scoreTmdbCandidate = (
  requestedNormalizedTitle: string,
  result: TmdbMovieSearchResult,
  requestedYear: number | null = null,
) => {
  const releaseYear = extractYear(result.release_date ?? "");
  if (requestedYear && requestedYear !== releaseYear) {
    return 0;
  }

  // A cinema may omit a subtitle, but not a sequel number. Compare each
  // localized/original title independently so unrelated variants cannot
  // contribute different parts of the same score.
  const candidateTitles = [result.title, result.original_title].flatMap(
    (title) => [title, title.split(/\s+-\s+|:\s*/)[0] ?? title],
  );
  const requestedNumbers = requestedNormalizedTitle.match(/\b\d+\b/g) ?? [];
  let titleScore = 0;

  for (const title of candidateTitles) {
    const candidate = normalizeForComparison(title);
    const candidateNumbers = candidate.match(/\b\d+\b/g) ?? [];
    if (requestedNumbers.join(" ") !== candidateNumbers.join(" ")) continue;
    if (!candidate || !requestedNormalizedTitle) continue;

    const inclusionBoost =
      candidate.includes(requestedNormalizedTitle) ||
      requestedNormalizedTitle.includes(candidate)
        ? 0.04
        : 0;
    const exactMatchBoost = candidate === requestedNormalizedTitle ? 0.02 : 0;

    titleScore = Math.max(
      titleScore,
      0.58 * getDiceSimilarity(requestedNormalizedTitle, candidate) +
        0.28 * getTokenOverlapScore(requestedNormalizedTitle, candidate) +
        inclusionBoost +
        exactMatchBoost,
    );
  }

  const releaseYearBoost =
    requestedYear && releaseYear && requestedYear === releaseYear ? 0.02 : 0;

  // Leave headroom: clamping every exact title to 1 erased the popularity
  // signal that distinguishes films sharing a title.
  const popularityBoost = Math.min(result.popularity / 150, 1) * 0.06;
  const posterPenalty = result.poster_path ? 0 : -0.2;

  const score = titleScore + releaseYearBoost + popularityBoost + posterPenalty;

  return clampScore(score);
};
