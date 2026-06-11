import { normalizeMovieTitle } from "../titleNormalization/normalizeMovieTitle";
import { sanitizeWhitespace } from "../titleNormalization/sanitizeWhitespace";

export const buildTmdbSearchQueries = (
    originalTitle: string,
    normalizedTitle: string
) => {
    const queries = [
        normalizedTitle,
        originalTitle,
        normalizeMovieTitle(originalTitle).normalizedTitle,
    ];

    const colonIndex = normalizedTitle.indexOf(":");
    if (colonIndex > 0) {
        queries.push(normalizedTitle.slice(0, colonIndex));
    }

    const dashIndex = normalizedTitle.indexOf(" - ");
    if (dashIndex > 0) {
        queries.push(normalizedTitle.slice(0, dashIndex));
    }

    return Array.from(
        new Set(
            queries
                .map((query) => sanitizeWhitespace(query))
                .filter((query) => query.length >= 2)
        )
    ).slice(0, 3);
};
