import { METADATA_MARKERS } from "./METADATA_MARKERS";
import { normalizeForTagCheck } from "./normalizeForTagCheck";

export const extractBracketTags = (title: string): string[] => {
    const tags: string[] = [];

    title.replace(/\(([^)]*)\)/g, (_full, section: string) => {
        const normalized = normalizeForTagCheck(section);
        if (normalized.length === 0) return "";

        const isMetadata = METADATA_MARKERS.some((marker) => new RegExp(`\\b${marker}\\b`, "i").test(normalized)
        );

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
