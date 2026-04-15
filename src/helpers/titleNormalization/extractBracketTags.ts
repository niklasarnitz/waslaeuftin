import { METADATA_MARKERS } from "./METADATA_MARKERS";
import { normalizeForTagCheck } from "./normalizeForTagCheck";

const METADATA_MARKERS_REGEX = new RegExp(`\\b(${METADATA_MARKERS.join('|')})\\b`, "i");

export const extractBracketTags = (title: string): string[] => {
    const tags: string[] = [];

    title.replace(/\(([^)]*)\)/g, (_full, section: string) => {
        const normalized = normalizeForTagCheck(section);
        if (normalized.length === 0) return "";

        const isMetadata = METADATA_MARKERS_REGEX.test(normalized);

        if (isMetadata) {
            const parts = section
                .split(/[,/]+/)
                .map((part) => part.trim())
                .filter(Boolean);

            tags.push(...parts);
        }

        return "";
    });

    return tags;
};
