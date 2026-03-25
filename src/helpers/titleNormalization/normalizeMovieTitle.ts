import { canonicalizeTag } from "./canonicalizeTag";
import { extractBracketTags } from "./extractBracketTags";
import { extractEventAffixes } from "./extractEventAffixes";
import { extractStandaloneTags } from "./extractStandaloneTags";
import { METADATA_MARKERS } from "./METADATA_MARKERS";
import { NormalizedMovieTitle } from "./NormalizedMovieTitle";
import { normalizeForTagCheck } from "./normalizeForTagCheck";
import { smartReplaceUnderscores } from "./smartReplaceUnderscores";
import { TAG_PATTERN } from "./TAG_PATTERN";


export const normalizeMovieTitle = (rawTitle: string): NormalizedMovieTitle => {
    let title = smartReplaceUnderscores(rawTitle);
    const bracketTags = extractBracketTags(title);

    let withoutMetadataBrackets = title
        .replace(/\(([^)]*)\)/g, (_full, section: string) => {
            const normalized = normalizeForTagCheck(section);
            if (normalized.length === 0) return " ";
            const isMetadata = METADATA_MARKERS.some((marker) => new RegExp(`\\b${marker}\\b`, "i").test(normalized)
            );
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
        .replace(/\s+-\s*$/, "")
        .replace(/-\s*$/, "")
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

    return {
        baseTitle: baseTitle || title.trim(),
        tags: uniqueTags,
    };
};
