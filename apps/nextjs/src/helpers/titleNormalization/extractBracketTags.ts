import { METADATA_REGEX } from "./METADATA_MARKERS";
import { normalizeForTagCheck } from "./normalizeForTagCheck";

export const extractBracketTags = (title: string): string[] => {
    const tags: string[] = [];

    title.replace(/\(([^)]*)\)/g, (_full, section: string) => {
        const normalized = normalizeForTagCheck(section);
        if (normalized.length === 0) return "";

        const isMetadata = METADATA_REGEX.test(normalized);

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
