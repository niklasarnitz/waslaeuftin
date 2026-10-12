import { smartReplaceUnderscores } from "./smartReplaceUnderscores";

/** Provider presentation cleanup belongs here, never in source adapters. */
export const prepareMovieTitle = (rawTitle: string): string =>
  smartReplaceUnderscores(rawTitle)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[’‘`´]/g, "'")
    // Remove decorative stars, but preserve letters joined by stars (M*A*S*H).
    .replace(/(?<![\p{L}\p{N}])\*+|\*+(?![\p{L}\p{N}])/gu, "")
    .replace(/\s*\|\s*CinemaxX\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
