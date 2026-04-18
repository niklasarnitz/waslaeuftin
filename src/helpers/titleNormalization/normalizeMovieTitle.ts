import { canonicalizeTag } from "./canonicalizeTag";
import { extractBracketTags } from "./extractBracketTags";
import { extractEventAffixes } from "./extractEventAffixes";
import { extractStandaloneTags } from "./extractStandaloneTags";
import { METADATA_REGEX } from "./METADATA_MARKERS";
import { NormalizedMovieTitle } from "./NormalizedMovieTitle";
import { normalizeForTagCheck } from "./normalizeForTagCheck";
import { smartReplaceUnderscores } from "./smartReplaceUnderscores";
import { TAG_PATTERN } from "./TAG_PATTERN";


const cache = new Map<string, NormalizedMovieTitle>();
const MAX_CACHE_SIZE = 10000; // Reasonable limit for movie titles

export const normalizeMovieTitle = (rawTitle: string): NormalizedMovieTitle => {
    if (cache.has(rawTitle)) {
        return cache.get(rawTitle)!;
    }

    let title = smartReplaceUnderscores(rawTitle);
    const bracketTags = extractBracketTags(title);

    let withoutMetadataBrackets = title
        .replace(/\(([^)]*)\)/g, (_full, section: string) => {
            const normalized = normalizeForTagCheck(section);
            if (normalized.length === 0) return " ";
            const isMetadata = METADATA_REGEX.test(normalized);
            return isMetadata ? " " : _full;
        })
        .trim();

    const affixResult = extractEventAffixes(withoutMetadataBrackets);
    const affixTags = affixResult.extracted;
    let baseTitleStr = affixResult.base;

    const standaloneTags = extractStandaloneTags(baseTitleStr);

    const baseTitle = baseTitleStr
        .replace(TAG_PATTERN, " ")
        .replace(/^:\s*/, "")
        .replace(/[–—]/g, "-")
        .replace(/[\s,\-]+$/, "")
        .replace(/\s+/g, " ")
        .trim();

    const uniqueTags: string[] = [];
    const seen = new Set<string>();

    const processTag = (tag: string | undefined) => {
        if (!tag) return;
        const canonical = canonicalizeTag(tag);
        const key = canonical.toLowerCase();

        if (!seen.has(key)) {
            seen.add(key);
            uniqueTags.push(canonical);
        }
    };

    for (const tag of bracketTags) processTag(tag);
    for (const tag of affixTags) processTag(tag);
    for (const tag of standaloneTags) processTag(tag);

    const finalTitle = baseTitle || title.trim();

    const result = {
        normalizedTitle: finalTitle.replace(/[\s,\-]+$/, ""), // Make sure no trailing commas/dashes remain even after fallbacks
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
