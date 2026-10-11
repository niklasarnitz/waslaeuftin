import { normalizeForComparison } from "./normalizeForComparison";
import { normalizeMovieTitle } from "./normalizeMovieTitle";

/** Search variants retain the full title; no shortened variant may erase a part. */
export const getMovieTitleCandidates = (title: string) => {
  const normalized = normalizeMovieTitle(title).normalizedTitle;
  const candidates = [normalized];
  const segments = normalized.split(/\s+[-–—]\s+|:\s*/);
  const suffix = segments.slice(1).join(" ");
  if (
    segments.length > 1 &&
    !/\b\d+\b|\b(?:part|teil|episode|chapter|kapitel)\b|\b[ivx]+\b/i.test(
      suffix,
    )
  ) {
    candidates.push(segments[0] ?? normalized);
  }
  return [...new Set(candidates)];
};

export const normalizeTitleOrdinals = (title: string) => {
  const roman: Record<string, string> = {
    ii: "2",
    iii: "3",
    iv: "4",
    v: "5",
    vi: "6",
    vii: "7",
    viii: "8",
    ix: "9",
    x: "10",
  };
  const words: Record<string, string> = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    eins: "1",
    zwei: "2",
    drei: "3",
    vier: "4",
    funf: "5",
  };
  return normalizeForComparison(title)
    .replace(/(?<=\S\s)\bi\b/g, "1")
    .replace(
      /\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b/g,
      (value) => roman[value] ?? value,
    )
    .replace(
      /\b(part|teil|episode|chapter|kapitel)\s+(one|two|three|four|five|eins|zwei|drei|vier|funf|i)\b/g,
      (_match, label: string, number: string) =>
        `${label} ${number === "i" ? "1" : words[number]}`,
    )
    .replace(/\b(part|teil|chapter|kapitel)\b/g, "teil");
};
