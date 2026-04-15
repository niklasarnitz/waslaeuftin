import { canonicalizeTag } from "./canonicalizeTag";
import { extractBracketTags } from "./extractBracketTags";
import { extractEventAffixes } from "./extractEventAffixes";
import { extractStandaloneTags } from "./extractStandaloneTags";
import { METADATA_MARKERS } from "./METADATA_MARKERS";
import { NormalizedMovieTitle } from "./NormalizedMovieTitle";
import { normalizeForTagCheck } from "./normalizeForTagCheck";
import { smartReplaceUnderscores } from "./smartReplaceUnderscores";
import { TAG_PATTERN } from "./TAG_PATTERN";


const cache = new Map<string, NormalizedMovieTitle>();
const MAX_CACHE_SIZE = 10000; // Reasonable limit for movie titles

const METADATA_MARKERS_REGEX = new RegExp(`\\b(${METADATA_MARKERS.join('|')})\\b`, "i");

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
            const isMetadata = METADATA_MARKERS_REGEX.test(normalized);
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
