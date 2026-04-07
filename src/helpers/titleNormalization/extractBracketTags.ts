import { METADATA_MARKERS } from "./METADATA_MARKERS";
import { normalizeForTagCheck } from "./normalizeForTagCheck";

// ⚡ Bolt: Precompile METADATA_MARKERS regex outside the function to prevent massive instantiation overhead inside the replace loops
const METADATA_PATTERN = new RegExp(`\\b(${METADATA_MARKERS.join('|')})\\b`, "i");

export const extractBracketTags = (title: string): string[] => {
    const tags: string[] = [];

    title.replace(/\(([^)]*)\)/g, (_full, section: string) => {
        const normalized = normalizeForTagCheck(section);
        if (normalized.length === 0) return "";

        const isMetadata = METADATA_PATTERN.test(normalized);

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
