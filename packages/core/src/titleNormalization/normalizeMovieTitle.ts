import type { NormalizedMovieTitle } from "./NormalizedMovieTitle";
import { canonicalizeTag } from "./canonicalizeTag";
import { extractBracketTags } from "./extractBracketTags";
import { extractEventAffixes } from "./extractEventAffixes";
import { extractStandaloneTags } from "./extractStandaloneTags";
import { METADATA_REGEX } from "./METADATA_MARKERS";
import { normalizeForTagCheck } from "./normalizeForTagCheck";
import { smartReplaceUnderscores } from "./smartReplaceUnderscores";
import { TAG_PATTERN } from "./TAG_PATTERN";

const cache = new Map<string, NormalizedMovieTitle>();
const MAX_CACHE_SIZE = 10000; // Reasonable limit for movie titles

const decodeHtmlAndCleanQuotes = (input: string): string => {
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[’‘`´]/g, "'");
};

export const normalizeMovieTitle = (rawTitle: string): NormalizedMovieTitle => {
  const cached = cache.get(rawTitle);
  if (cached) {
    return cached;
  }

  const title = decodeHtmlAndCleanQuotes(smartReplaceUnderscores(rawTitle));
  const bracketTags = extractBracketTags(title);

  const withoutMetadataBrackets = title
    .replace(/\(([^)]*)\)/g, (_full, section: string) => {
      const normalized = normalizeForTagCheck(section);
      if (normalized.length === 0) return " ";
      const isYear = /\b(19|20)\d{2}\b/.test(normalized);
      const isMetadata = isYear || METADATA_REGEX.test(normalized);
      return isMetadata ? " " : _full;
    })
    .trim();

  const affixResult = extractEventAffixes(withoutMetadataBrackets);
  const affixTags = affixResult.extracted;
  const baseTitleStr = affixResult.base;

  const standaloneTags = extractStandaloneTags(baseTitleStr);

  const baseTitle = baseTitleStr
    .replace(TAG_PATTERN, " ")
    .replace(/^:\s*/, "")
    .replace(/[–—]/g, "-")
    .replace(/[\s,-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const allTags = [...bracketTags, ...affixTags, ...standaloneTags];
  const uniqueTags: string[] = [];
  const seen = new Set<string>();

  for (const tag of allTags) {
    if (!tag) continue;
    const canonical = canonicalizeTag(tag);
    const key = canonical.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(canonical);
    }
  }

  const finalTitle = baseTitle || title.trim();

  const result = {
    normalizedTitle: finalTitle.replace(/[\s,-]+$/, ""), // Make sure no trailing commas/dashes remain even after fallbacks
    tags: uniqueTags,
  };

  Object.freeze(result.tags);
  Object.freeze(result);

  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (Map iterates in insertion order)
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(rawTitle, result);

  return result;
};
