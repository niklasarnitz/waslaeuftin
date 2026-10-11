import {
  extractYear,
  getMovieTitleCandidates,
  normalizeTitleOrdinals,
  sanitizeWhitespace,
} from "@waslaeuftin/core";
import { clampScore } from "@waslaeuftin/helpers/similarity/clampScore";
import { getDiceSimilarity } from "@waslaeuftin/helpers/similarity/getDiceSimilarity";
import { getTokenOverlapScore } from "@waslaeuftin/helpers/similarity/getTokenOverlapScore";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";

export const scoreTmdbCandidate = (
  requestedNormalizedTitle: string,
  result: TmdbMovieSearchResult,
  requestedYear: number | null = null,
  alternativeTitles: string[] = [],
) => {
  const releaseYear = extractYear(result.release_date ?? "");
  if (requestedYear && requestedYear !== releaseYear) {
    return 0;
  }

  // A cinema may omit a subtitle, but not a sequel number. Compare each
  // localized/original title independently so unrelated variants cannot
  // contribute different parts of the same score.
  const requestedTitles = getMovieTitleCandidates(requestedNormalizedTitle);
  const hasRequestedOrdinal = /\b\d+\b/.test(
    normalizeTitleOrdinals(requestedTitles[0] ?? ""),
  );
  const candidateTitles = [
    result.title,
    result.original_title,
    ...alternativeTitles,
  ];
  const originalBase = normalizeTitleOrdinals(
    getMovieTitleCandidates(result.original_title).at(-1) ?? "",
  );
  const localizedBase = getMovieTitleCandidates(result.title).at(-1) ?? "";
  // An official numbered alias can establish the ordinal for the localized
  // franchise prefix too. Never infer sequel order from popularity or years.
  for (const alias of alternativeTitles) {
    for (const variant of getMovieTitleCandidates(alias)) {
      const numberedBase =
        normalizeTitleOrdinals(variant).match(/^(.*)\s+(\d+)$/);
      if (numberedBase?.[1] === originalBase)
        candidateTitles.push(`${localizedBase} ${numberedBase[2]}`);
    }
  }
  let titleScore = 0;

  for (const [aliasIndex, title] of candidateTitles.entries()) {
    for (const [candidateIndex, variant] of getMovieTitleCandidates(
      title,
    ).entries()) {
      const candidate = normalizeTitleOrdinals(variant);
      const candidateNumbers = candidate.match(/\b\d+\b/g) ?? [];
      for (const [
        requestedIndex,
        requestedVariant,
      ] of requestedTitles.entries()) {
        // Dropping both subtitles would make different films in one series
        // look identical. At least one side must retain its complete title.
        if (requestedIndex > 0 && candidateIndex > 0) continue;
        if (requestedIndex > 0 && hasRequestedOrdinal) continue;
        let requested = normalizeTitleOrdinals(requestedVariant);
        const requestedNumbers = requested.match(/\b\d+\b/g) ?? [];
        if (requestedNumbers.join(" ") !== candidateNumbers.join(" ")) {
          // Some official localized titles omit a franchise ordinal. Only
          // tolerate it when the entire remaining title matches, including
          // the named subtitle and any split-part number (Mockingjay Teil 1).
          const withoutFranchiseOrdinal = sanitizeWhitespace(
            requested.replace(/(?<=\S\s)\b([1-9]|10)\b(?=\s+\S)/, ""),
          );
          if (
            requestedIndex !== 0 ||
            candidateIndex !== 0 ||
            withoutFranchiseOrdinal !== candidate
          )
            continue;
          requested = withoutFranchiseOrdinal;
        }
        if (!candidate || !requested) continue;

        const inclusionBoost =
          candidate.includes(requested) || requested.includes(candidate)
            ? 0.04
            : 0;
        const exactMatchBoost = candidate === requested ? 0.02 : 0;

        titleScore = Math.max(
          titleScore,
          0.58 * getDiceSimilarity(requested, candidate) +
            0.28 * getTokenOverlapScore(requested, candidate) +
            inclusionBoost +
            exactMatchBoost -
            (requestedIndex > 0 ? 0.06 : 0) -
            (candidateIndex > 0 ? 0.02 : 0) -
            (aliasIndex === 1 ? 0.04 : 0),
        );
      }
    }
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
