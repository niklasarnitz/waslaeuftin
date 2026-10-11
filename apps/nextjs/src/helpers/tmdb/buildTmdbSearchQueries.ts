import { getMovieTitleCandidates, sanitizeWhitespace } from "@waslaeuftin/core";

export const buildTmdbSearchQueries = (
  originalTitle: string,
  normalizedTitle: string,
) => {
  const roman: Record<string, string> = {
    "1": "I",
    "2": "II",
    "3": "III",
    "4": "IV",
    "5": "V",
    "6": "VI",
    "7": "VII",
    "8": "VIII",
    "9": "IX",
    "10": "X",
  };
  const queries = [
    normalizedTitle,
    normalizedTitle.replace(
      /\b([1-9]|10)\b/,
      (number) => roman[number] ?? number,
    ),
    ...getMovieTitleCandidates(normalizedTitle).slice(1),
    originalTitle,
  ];

  return Array.from(
    new Set(
      queries
        .map((query) => sanitizeWhitespace(query))
        .filter((query) => query.length >= 2),
    ),
  ).slice(0, 4);
};
