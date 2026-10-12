import type { TmdbMovieDetailsResponse } from "@waslaeuftin/types/TmdbMovieDetailsResponse";
import type { MovieIdentityEvidence } from "@waslaeuftin/validators";
import {
  classifySneakTitle,
  extractYear,
  getMovieTitleCandidates,
  getScreenedPerformance,
  normalizeForComparison,
  normalizeMovieTitle,
  normalizeTitleOrdinals,
} from "@waslaeuftin/core";
import { env } from "@waslaeuftin/env";
import { RateLimitedQueue } from "@waslaeuftin/helpers/RateLimitedQueue";
import {
  hasTmdbTitleConflict,
  scoreTmdbCandidate,
} from "@waslaeuftin/helpers/similarity/scoreTmdbCandidate";
import { buildTmdbSearchQueries } from "@waslaeuftin/helpers/tmdb/buildTmdbSearchQueries";
import { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import { TmdbMovieSearchResponse } from "@waslaeuftin/types/TmdbMovieSearchResponse";
import { TmdbMovieSearchResult } from "@waslaeuftin/types/TmdbMovieSearchResult";
import { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";
import { MovieIdentityEvidenceSchema } from "@waslaeuftin/validators";

export const MOVIE_MATCHER_VERSION = 3;

// ─── TMDB matcher ───────────────────────────────────────────────────────────
export class TmdbMovieMatcher {
  private readonly evaluationCache = new Map<string, TmdbMatchEvaluation>();
  private readonly alternativeTitleCache = new Map<number, string[]>();
  private readonly detailsCache = new Map<
    number,
    Pick<TmdbMovieDetailsResponse, "runtime" | "credits">
  >();
  private readonly rateLimitQueue = new RateLimitedQueue(3, 334); // 3 concurrent requests, ~334ms between requests

  async evaluate(
    title: string,
    suppliedEvidence: MovieIdentityEvidence = {},
  ): Promise<TmdbMatchEvaluation> {
    const evidence = MovieIdentityEvidenceSchema.parse(suppliedEvidence);
    const normalizedMovieTitleForSearch =
      normalizeMovieTitle(title).normalizedTitle;
    const normalizedTitle = normalizeForComparison(
      normalizedMovieTitleForSearch,
    );
    const titleYear = extractYear(title.match(/\((?:19|20)\d{2}\)/)?.[0] ?? "");
    const requestedYear = evidence.productionYear ?? titleYear;
    const conflictingYear = Boolean(
      titleYear &&
      evidence.productionYear &&
      titleYear !== evidence.productionYear,
    );
    const performance = getScreenedPerformance(title);
    const isProgramme =
      /\b(?:trilogie|trilogy|double feature)\b|\b(?:triple|marathon)\s*(?:\([^)]*\))?\s*$|\b\d{1,2}\s*[+-]\s*\d{1,2}\b/i.test(
        title,
      );
    if (
      classifySneakTitle(title).isUnannounced ||
      isProgramme ||
      conflictingYear ||
      (performance && !performance.season && !requestedYear)
    ) {
      return {
        requestedTitle: title,
        normalizedTitle,
        threshold: env.TMDB_MIN_CONFIDENCE_SCORE,
        bestCandidate: null,
        acceptedCandidate: null,
        decisionReason: conflictingYear
          ? "conflicting-year"
          : isProgramme
            ? "programme"
            : classifySneakTitle(title).isUnannounced
              ? "unannounced-screening"
              : "missing-production-context",
        candidates: [],
      };
    }
    // Read the explicit year before normalization removes metadata brackets.
    // Bare numbers can be part of the title (e.g. 2001: A Space Odyssey).
    const cacheKey = JSON.stringify([
      title.trim(),
      evidence.productionYear,
      evidence.originalTitle,
      evidence.director,
      evidence.runtimeMinutes,
    ]);

    const cached = this.evaluationCache.get(cacheKey);
    if (cached) {
      return { ...cached, requestedTitle: title };
    }

    const queries = buildTmdbSearchQueries(
      title,
      normalizedMovieTitleForSearch,
    );
    if (evidence.originalTitle && !queries.includes(evidence.originalTitle))
      queries.push(evidence.originalTitle);
    const scoreWithEvidence = (
      movie: TmdbMovieSearchResult,
      aliases: string[] = [],
    ) => {
      if (hasTmdbTitleConflict(normalizedMovieTitleForSearch, movie, aliases))
        return 0;
      if (
        evidence.originalTitle &&
        ![movie.title, movie.original_title, ...aliases].some(
          (alias) =>
            normalizeTitleOrdinals(
              normalizeMovieTitle(alias).normalizedTitle,
            ) === normalizeTitleOrdinals(evidence.originalTitle!),
        )
      )
        return 0;
      return Math.max(
        scoreTmdbCandidate(
          normalizedMovieTitleForSearch,
          movie,
          requestedYear,
          aliases,
        ),
        evidence.originalTitle
          ? scoreTmdbCandidate(
              evidence.originalTitle,
              movie,
              requestedYear,
              aliases,
            )
          : 0,
      );
    };
    const scoredCandidates: TmdbScoredMatch[] = [];
    const searchCandidates = new Map<number, TmdbMovieSearchResult>();

    const searchPromises = queries.map((query) =>
      this.rateLimitQueue.run(async () => {
        const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
        searchUrl.searchParams.set("api_key", env.TMDB_API_KEY);
        searchUrl.searchParams.set("query", query);
        searchUrl.searchParams.set("language", "de-DE");
        searchUrl.searchParams.set("include_adult", "false");
        searchUrl.searchParams.set("page", "1");
        if (requestedYear) {
          searchUrl.searchParams.set(
            "primary_release_year",
            String(requestedYear),
          );
        }

        const searchResponse = await fetch(searchUrl, {
          headers: { Accept: "application/json" },
        });

        if (!searchResponse.ok) {
          throw new Error(
            `TMDB search failed (${searchResponse.status}) for query "${query}"`,
          );
        }

        const result = (await searchResponse.json()) as TmdbMovieSearchResponse;
        return { query, result };
      }),
    );

    const results = await Promise.all(searchPromises);

    for (const { query, result } of results) {
      const topResults = result.results.slice(0, 7);

      for (const movieResult of topResults) {
        if (performance) {
          const candidatePerformance = getScreenedPerformance(
            `${movieResult.title} ${movieResult.original_title}`,
          );
          if (
            !candidatePerformance ||
            candidatePerformance.brand !== performance.brand ||
            (performance.season &&
              performance.season !== candidatePerformance.season)
          )
            continue;
        }
        searchCandidates.set(movieResult.id, movieResult);
        scoredCandidates.push({
          tmdbMovieId: movieResult.id,
          title: movieResult.title,
          originalTitle: movieResult.original_title,
          posterPath: movieResult.poster_path,
          releaseDate: movieResult.release_date,
          popularity: movieResult.popularity,
          confidence: scoreWithEvidence(movieResult),
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

    const officialAliases = new Map<number, string[]>();
    const hasFullAlias = (candidate: TmdbScoredMatch) =>
      [
        candidate.title,
        candidate.originalTitle,
        ...(officialAliases.get(candidate.tmdbMovieId) ?? []),
      ].some(
        (alias) =>
          normalizeTitleOrdinals(normalizeMovieTitle(alias).normalizedTitle) ===
            normalizeTitleOrdinals(normalizedMovieTitleForSearch) ||
          (Boolean(evidence.originalTitle) &&
            normalizeTitleOrdinals(
              normalizeMovieTitle(alias).normalizedTitle,
            ) === normalizeTitleOrdinals(evidence.originalTitle!)),
      );
    const isAmbiguousPair = (best: TmdbScoredMatch, other: TmdbScoredMatch) => {
      if (other.confidence < env.TMDB_MIN_CONFIDENCE_SCORE) return false;
      const bestIsFull = hasFullAlias(best);
      const otherIsFull = hasFullAlias(other);
      return (
        (bestIsFull && otherIsFull) ||
        (!bestIsFull &&
          !otherIsFull &&
          [best, other].every((match) =>
            getMovieTitleCandidates(match.title)
              .slice(1)
              .some(
                (variant) =>
                  normalizeTitleOrdinals(variant) ===
                  normalizeTitleOrdinals(normalizedMovieTitleForSearch),
              ),
          )) ||
        (!bestIsFull &&
          normalizeForComparison(
            normalizeMovieTitle(best.title).normalizedTitle,
          ) ===
            normalizeForComparison(
              normalizeMovieTitle(other.title).normalizedTitle,
            )) ||
        (best.confidence - other.confidence < 0.02 &&
          !(bestIsFull && !otherIsFull))
      );
    };
    const initialBest = [...byTmdbId.values()].sort(
      (a, b) => b.confidence - a.confidence,
    )[0];
    // Resolve numbered aliases and actual ambiguity, not every movie on every
    // import. Keep authoritative alias retrieval bounded to seven identities.
    if (
      !performance &&
      (((evidence.originalTitle ||
        getMovieTitleCandidates(normalizedMovieTitleForSearch).length > 1 ||
        /\b\d+\b/.test(
          normalizeTitleOrdinals(normalizedMovieTitleForSearch),
        )) &&
        ![...byTmdbId.values()].some(
          (candidate) => candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
        )) ||
        (initialBest &&
          [...byTmdbId.values()].some(
            (candidate) =>
              candidate.tmdbMovieId !== initialBest.tmdbMovieId &&
              isAmbiguousPair(initialBest, candidate),
          )))
    ) {
      for (const candidate of [...searchCandidates.values()]
        .filter(
          (movie) =>
            !requestedYear ||
            extractYear(movie.release_date ?? "") === requestedYear,
        )
        .slice(0, 7)) {
        let aliases = this.alternativeTitleCache.get(candidate.id);
        if (!aliases) {
          aliases = await this.rateLimitQueue.run(async () => {
            const url = new URL(
              `https://api.themoviedb.org/3/movie/${candidate.id}/alternative_titles`,
            );
            url.searchParams.set("api_key", env.TMDB_API_KEY);
            const response = await fetch(url, {
              headers: { Accept: "application/json" },
            });
            if (!response.ok)
              throw new Error(
                `TMDB alternate titles failed (${response.status}) for ${candidate.id}`,
              );
            const data = (await response.json()) as {
              titles: { title: string }[];
            };
            return data.titles.map((alias) => alias.title);
          });
          this.alternativeTitleCache.set(candidate.id, aliases);
        }
        const evidenceAliases = [...aliases];
        // Bilingual cinema titles can join two names for the same film. The
        // first must be a complete primary/original title and the second an
        // official alias, rather than a model-invented translation.
        const parts = normalizedMovieTitleForSearch
          .split(/\s+[-–—]\s+|:\s*/)
          .map(normalizeTitleOrdinals);
        if (
          parts.length === 2 &&
          [candidate.title, candidate.original_title].some(
            (title) =>
              normalizeTitleOrdinals(
                normalizeMovieTitle(title).normalizedTitle,
              ) === parts[0],
          ) &&
          aliases.some((alias) =>
            getMovieTitleCandidates(alias).some(
              (variant) => normalizeTitleOrdinals(variant) === parts[1],
            ),
          )
        ) {
          evidenceAliases.push(normalizedMovieTitleForSearch);
        }
        officialAliases.set(candidate.id, evidenceAliases);
        const scored = byTmdbId.get(candidate.id)!;
        scored.confidence = Math.max(
          scored.confidence,
          scoreWithEvidence(candidate, evidenceAliases),
        );
      }
    }

    const candidates = [...byTmdbId.values()];
    const rejectedCandidates: NonNullable<
      TmdbMatchEvaluation["rejectedCandidates"]
    > = [];
    for (const candidate of byTmdbId.values()) {
      if (
        hasTmdbTitleConflict(
          normalizedMovieTitleForSearch,
          searchCandidates.get(candidate.tmdbMovieId)!,
          officialAliases.get(candidate.tmdbMovieId),
        )
      ) {
        rejectedCandidates.push({
          tmdbMovieId: candidate.tmdbMovieId,
          titleConflict: true,
          directorConflict: false,
          runtimeConflict: false,
          observedDirectors: [],
          observedRuntime: null,
        });
        byTmdbId.delete(candidate.tmdbMovieId);
      }
    }
    if (evidence.director || evidence.runtimeMinutes) {
      // Check after alias retrieval, so aliases cannot bypass constraints.
      for (const candidate of [...byTmdbId.values()].filter(
        (candidate) => candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
      )) {
        let details = this.detailsCache.get(candidate.tmdbMovieId);
        if (!details) {
          details = await this.rateLimitQueue.run(async () => {
            const url = new URL(
              `https://api.themoviedb.org/3/movie/${candidate.tmdbMovieId}`,
            );
            url.searchParams.set("api_key", env.TMDB_API_KEY);
            url.searchParams.set("append_to_response", "credits");
            const response = await fetch(url, {
              headers: { Accept: "application/json" },
            });
            if (!response.ok)
              throw new Error(
                `TMDB identity details failed (${response.status}) for ${candidate.tmdbMovieId}`,
              );
            return (await response.json()) as Pick<
              TmdbMovieDetailsResponse,
              "runtime" | "credits"
            >;
          });
          this.detailsCache.set(candidate.tmdbMovieId, details);
        }
        const directors =
          details.credits?.crew
            .filter((person) => person.job === "Director")
            .map((person) => person.name) ?? [];
        const requestedDirectors =
          evidence.director
            ?.split(/\s*[/;&,]\s*|\s+(?:und|and)\s+/i)
            .filter(Boolean)
            .map(normalizeForComparison) ?? [];
        const normalizedDirectors = directors.map(normalizeForComparison);
        const directorConflict = Boolean(
          evidence.director &&
          !normalizedDirectors.includes(
            normalizeForComparison(evidence.director),
          ) &&
          requestedDirectors.some(
            (name) => !normalizedDirectors.includes(name),
          ),
        );
        const runtimeConflict = Boolean(
          evidence.runtimeMinutes &&
          (!details.runtime ||
            Math.abs(details.runtime - evidence.runtimeMinutes) > 5),
        );
        if (directorConflict || runtimeConflict) {
          rejectedCandidates.push({
            tmdbMovieId: candidate.tmdbMovieId,
            directorConflict,
            runtimeConflict,
            observedDirectors: directors,
            observedRuntime: details.runtime ?? null,
          });
          byTmdbId.delete(candidate.tmdbMovieId);
        }
      }
    }

    // A confirmed full alias beats a popular film matching only a prefix.
    const fullOfficialMatches = [...byTmdbId.values()].filter((candidate) =>
      officialAliases
        .get(candidate.tmdbMovieId)
        ?.some(
          (alias) =>
            normalizeTitleOrdinals(
              normalizeMovieTitle(alias).normalizedTitle,
            ) === normalizeTitleOrdinals(normalizedMovieTitleForSearch),
        ),
    );
    let bestCandidate: TmdbScoredMatch | null = null;
    for (const candidate of fullOfficialMatches.length
      ? fullOfficialMatches
      : byTmdbId.values()) {
      if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
        bestCandidate = candidate;
      }
    }

    const alternatives = [...byTmdbId.values()].filter(
      (candidate) =>
        candidate.tmdbMovieId !== bestCandidate?.tmdbMovieId &&
        candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
    );
    const ambiguous =
      bestCandidate &&
      alternatives.some((candidate) =>
        isAmbiguousPair(bestCandidate, candidate),
      );

    const acceptedCandidate =
      bestCandidate &&
      !ambiguous &&
      bestCandidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE &&
      Boolean(bestCandidate.posterPath)
        ? bestCandidate
        : null;

    const evaluation: TmdbMatchEvaluation = {
      requestedTitle: title,
      normalizedTitle,
      threshold: env.TMDB_MIN_CONFIDENCE_SCORE,
      bestCandidate,
      acceptedCandidate,
      decisionReason: acceptedCandidate
        ? "matched"
        : ambiguous
          ? "ambiguous"
          : bestCandidate && !bestCandidate.posterPath
            ? "missing-poster"
            : rejectedCandidates.length &&
                ![...byTmdbId.values()].some(
                  (candidate) =>
                    candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
                )
              ? "identity-evidence-conflict"
              : "insufficient-evidence",
      candidates,
      rejectedCandidates,
    };
    this.evaluationCache.set(cacheKey, evaluation);

    return evaluation;
  }
}
