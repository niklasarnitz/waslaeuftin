import { env } from "@waslaeuftin/env";
import { buildTmdbSearchQueries } from "./buildTmdbSearchQueries";
import { RateLimitedQueue } from "../RateLimitedQueue";
import { scoreTmdbCandidate } from "../similarity/scoreTmdbCandidate";
import { normalizeForComparison } from "../titleNormalization/normalizeForComparison";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";
import { normalizeMovieTitle } from "../titleNormalization/normalizeMovieTitle";
import { TmdbMovieSearchResponse } from "@waslaeuftin/types/TmdbMovieSearchResponse";

// ─── TMDB matcher ───────────────────────────────────────────────────────────
export class TmdbMovieMatcher {
    private readonly searchCache = new Map<
        string,
        { bestCandidate: TmdbScoredMatch | null; acceptedCandidate: TmdbScoredMatch | null; }
    >();
    private readonly rateLimitQueue = new RateLimitedQueue(3, 334); // 3 concurrent requests, ~334ms between requests

    async evaluate(title: string) {
        const normalizedMovieTitleForSearch = normalizeMovieTitle(title).normalizedTitle;
        const normalizedTitle = normalizeForComparison(
            normalizedMovieTitleForSearch
        );
        const cacheKey = normalizedTitle || normalizeForComparison(title);

        const cached = this.searchCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const queries = buildTmdbSearchQueries(
            title,
            normalizedMovieTitleForSearch
        );
        const scoredCandidates: TmdbScoredMatch[] = [];

        for (const query of queries) {
            const result = await this.rateLimitQueue.run(async () => {
                const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
                searchUrl.searchParams.set("api_key", env.TMDB_API_KEY);
                searchUrl.searchParams.set("query", query);
                searchUrl.searchParams.set("language", "de-DE");
                searchUrl.searchParams.set("include_adult", "false");
                searchUrl.searchParams.set("page", "1");

                const searchResponse = await fetch(searchUrl, {
                    headers: { Accept: "application/json" },
                });

                if (!searchResponse.ok) {
                    throw new Error(
                        `TMDB search failed (${searchResponse.status}) for query "${query}"`
                    );
                }

                return (await searchResponse.json()) as TmdbMovieSearchResponse;
            });

            const topResults = result.results.slice(0, 7);

            for (const movieResult of topResults) {
                scoredCandidates.push({
                    tmdbMovieId: movieResult.id,
                    title: movieResult.title,
                    originalTitle: movieResult.original_title,
                    posterPath: movieResult.poster_path,
                    releaseDate: movieResult.release_date,
                    popularity: movieResult.popularity,
                    confidence: scoreTmdbCandidate(normalizedTitle, movieResult),
                    sourceQuery: query,
                });
            }
        }

        const byTmdbId = new Map<number, TmdbScoredMatch>();
        for (const candidate of scoredCandidates) {
            const existing = byTmdbId.get(candidate.tmdbMovieId);
            if (!existing || candidate.confidence > existing.confidence) {
                byTmdbId.set(candidate.tmdbMovieId, candidate);
            }
        }

        let bestCandidate: TmdbScoredMatch | null = null;
        for (const candidate of byTmdbId.values()) {
            if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
                bestCandidate = candidate;
            }
        }

        const acceptedCandidate = bestCandidate &&
            bestCandidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE &&
            Boolean(bestCandidate.posterPath)
            ? bestCandidate
            : null;

        const result = { bestCandidate, acceptedCandidate };
        this.searchCache.set(cacheKey, result);

        return result;
    }
}
