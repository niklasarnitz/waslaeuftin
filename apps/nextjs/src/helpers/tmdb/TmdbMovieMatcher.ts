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
  prepareMovieTitle,
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

export const MOVIE_MATCHER_VERSION = 11;

// ─── TMDB matcher ───────────────────────────────────────────────────────────
export class TmdbMovieMatcher {
  private readonly evaluationCache = new Map<string, TmdbMatchEvaluation>();
  private readonly alternativeTitleCache = new Map<number, string[]>();
  private readonly personAliasCache = new Map<number, string[]>();
  private readonly detailsCache = new Map<
    string,
    Pick<
      TmdbMovieDetailsResponse,
      "runtime" | "credits" | "release_dates" | "videos"
    >
  >();
  private readonly rateLimitQueue = new RateLimitedQueue(3, 334); // 3 concurrent requests, ~334ms between requests

  async evaluate(
    title: string,
    suppliedEvidence: MovieIdentityEvidence = {},
  ): Promise<TmdbMatchEvaluation> {
    const evidence = MovieIdentityEvidenceSchema.parse(suppliedEvidence);
    const preparedTitle = prepareMovieTitle(title);
    const normalizedMovieTitleForSearch =
      normalizeMovieTitle(preparedTitle).normalizedTitle;
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
        preparedTitle,
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
      evidence.tmdbId,
      evidence.productionYear,
      evidence.originalTitle,
      evidence.director,
      evidence.runtimeMinutes,
      evidence.edition,
      evidence.youtubeTrailerIds,
      evidence.directorAlternatives,
      evidence.germanTheatricalReleaseDate,
      evidence.officialTitleAliases,
    ]);

    const cached = this.evaluationCache.get(cacheKey);
    if (cached) {
      return { ...cached, requestedTitle: title };
    }

    const queries = buildTmdbSearchQueries(
      preparedTitle,
      normalizedMovieTitleForSearch,
    );
    if (evidence.originalTitle && !queries.includes(evidence.originalTitle))
      queries.push(evidence.originalTitle);
    const directorClaims = [
      evidence.director,
      ...(evidence.directorAlternatives ?? []),
    ].filter((claim): claim is string => Boolean(claim));
    const canCorroborateTheatricalRelease = Boolean(
      !titleYear &&
      !performance &&
      evidence.productionYear &&
      evidence.germanTheatricalReleaseDate &&
      evidence.originalTitle &&
      directorClaims.length &&
      evidence.runtimeMinutes,
    );
    const matchesOfficialTrailer = (
      videos: TmdbMovieDetailsResponse["videos"],
    ) =>
      videos?.results.some(
        (video) =>
          video.site === "YouTube" &&
          video.official &&
          (video.type === "Trailer" || video.type === "Teaser") &&
          evidence.youtubeTrailerIds?.includes(video.key),
      ) ?? false;
    const officialAliases = new Map<number, string[]>();
    const loadSourceTitleAliases = async (movie: TmdbMovieSearchResult) => {
      if (performance) return;
      const aliases = (evidence.officialTitleAliases ?? []).filter(
        (alias) =>
          normalizeTitleOrdinals(
            normalizeMovieTitle(alias.title).normalizedTitle,
          ) === normalizeTitleOrdinals(normalizedMovieTitleForSearch) &&
          alias.productionYear === extractYear(movie.release_date ?? "") &&
          [movie.title, movie.original_title].some(
            (title) =>
              normalizeTitleOrdinals(
                normalizeMovieTitle(title).normalizedTitle,
              ) ===
              normalizeTitleOrdinals(
                normalizeMovieTitle(alias.originalTitle).normalizedTitle,
              ),
          ),
      );
      if (!aliases.length) return;
      const details = await this.getIdentityDetails(movie.id);
      const runtime =
        details.runtime ||
        (await this.getIdentityDetails(movie.id, "de-DE")).runtime;
      const verified: string[] = [];
      for (const alias of aliases) {
        await this.loadDirectorAliases(
          [alias.director],
          details.credits?.crew ?? [],
        );
        if (
          runtime &&
          Math.abs(runtime - alias.runtimeMinutes) <= 5 &&
          this.matchesDirectors([alias.director], details.credits?.crew ?? [])
        )
          verified.push(alias.title);
      }
      if (verified.length) officialAliases.set(movie.id, verified);
    };
    const scoreWithEvidence = (
      movie: TmdbMovieSearchResult,
      aliases: string[] = officialAliases.get(movie.id) ?? [],
    ) => {
      if (hasTmdbTitleConflict(normalizedMovieTitleForSearch, movie, aliases))
        return 0;
      const candidateTitles = [movie.title, movie.original_title, ...aliases];
      const fullListingTitle = candidateTitles.some(
        (alias) =>
          normalizeTitleOrdinals(normalizeMovieTitle(alias).normalizedTitle) ===
          normalizeTitleOrdinals(normalizedMovieTitleForSearch),
      );
      const details = this.detailsCache.get(`${movie.id}:`);
      // An exact provider/TMDB official trailer cross-reference can establish
      // a working title, but never replaces the other identity constraints.
      const corroboratedTrailer = Boolean(
        fullListingTitle &&
        evidence.productionYear &&
        evidence.productionYear === extractYear(movie.release_date ?? "") &&
        evidence.runtimeMinutes &&
        details?.runtime &&
        Math.abs(evidence.runtimeMinutes - details.runtime) <= 5 &&
        this.matchesDirectors(directorClaims, details.credits?.crew ?? []) &&
        matchesOfficialTrailer(details.videos),
      );
      if (
        evidence.originalTitle &&
        !corroboratedTrailer &&
        !candidateTitles.some(
          (alias) =>
            normalizeTitleOrdinals(
              normalizeMovieTitle(alias).normalizedTitle,
            ) === normalizeTitleOrdinals(evidence.originalTitle!) ||
            // A shortened original can corroborate an already complete
            // listing identity, but cannot select an installment by itself.
            (fullListingTitle &&
              getMovieTitleCandidates(alias)
                .slice(1)
                .some(
                  (variant) =>
                    normalizeTitleOrdinals(variant) ===
                    normalizeTitleOrdinals(evidence.originalTitle!),
                )),
        )
      )
        return 0;
      // Production and first release can straddle a year. Only a native ID,
      // director and known matching runtime can corroborate that difference;
      // an explicit year in the listing remains a hard identity constraint.
      const releaseYear = extractYear(movie.release_date ?? "");
      const firstRecordedReleaseYear = Math.min(
        ...(details?.release_dates?.results
          .flatMap((country) =>
            country.release_dates.map((release) =>
              extractYear(release.release_date ?? ""),
            ),
          )
          .filter((year): year is number => year !== null) ?? []),
      );
      const corroboratedFirstRelease = Boolean(
        !titleYear &&
        fullListingTitle &&
        evidence.productionYear &&
        releaseYear === evidence.productionYear + 1 &&
        firstRecordedReleaseYear === evidence.productionYear &&
        evidence.runtimeMinutes &&
        details?.runtime &&
        Math.abs(details.runtime - evidence.runtimeMinutes) <= 5,
      );
      const corroboratedNativeYear = Boolean(
        !titleYear &&
        evidence.tmdbId === movie.id &&
        requestedYear &&
        releaseYear &&
        Math.abs(releaseYear - requestedYear) === 1 &&
        evidence.director &&
        details?.credits?.crew.some((person) => person.job === "Director") &&
        evidence.runtimeMinutes &&
        details?.runtime &&
        Math.abs(details.runtime - evidence.runtimeMinutes) <= 5,
      );
      const theatricalRuntime =
        details?.runtime || this.detailsCache.get(`${movie.id}:de-DE`)?.runtime;
      // A source's production-year field can contain a local start or bad
      // catalog year. Correct it only through an independently recorded exact
      // German theatrical date AND complete titles, known director and runtime.
      // Never reinterpret an explicit year in the listing or a premiere/VOD date.
      const corroboratedTheatricalRelease = Boolean(
        canCorroborateTheatricalRelease &&
        fullListingTitle &&
        candidateTitles.some(
          (alias) =>
            normalizeTitleOrdinals(
              normalizeMovieTitle(alias).normalizedTitle,
            ) === normalizeTitleOrdinals(evidence.originalTitle!),
        ) &&
        this.matchesDirectors(directorClaims, details?.credits?.crew ?? []) &&
        theatricalRuntime &&
        evidence.runtimeMinutes &&
        Math.abs(theatricalRuntime - evidence.runtimeMinutes) <= 5 &&
        details?.release_dates?.results.some(
          (country) =>
            country.iso_3166_1 === "DE" &&
            country.release_dates.some(
              (release) =>
                (release.type === 2 || release.type === 3) &&
                release.release_date?.slice(0, 10) ===
                  evidence.germanTheatricalReleaseDate,
            ),
        ),
      );
      const scoringYear =
        corroboratedNativeYear ||
        corroboratedFirstRelease ||
        corroboratedTheatricalRelease
          ? null
          : requestedYear;
      return Math.max(
        scoreTmdbCandidate(
          normalizedMovieTitleForSearch,
          movie,
          scoringYear,
          aliases,
        ),
        evidence.originalTitle
          ? scoreTmdbCandidate(
              evidence.originalTitle,
              movie,
              scoringYear,
              aliases,
            )
          : 0,
      );
    };
    const loadTheatricalReleaseEvidence = async (
      movie: TmdbMovieSearchResult,
      aliases: string[] = [],
    ) => {
      if (
        !canCorroborateTheatricalRelease ||
        extractYear(movie.release_date ?? "") === requestedYear ||
        ![normalizedMovieTitleForSearch, evidence.originalTitle!].every(
          (title) =>
            [movie.title, movie.original_title, ...aliases].some(
              (alias) =>
                normalizeTitleOrdinals(
                  normalizeMovieTitle(alias).normalizedTitle,
                ) === normalizeTitleOrdinals(title),
            ),
        )
      )
        return;
      const details = await this.getIdentityDetails(movie.id);
      if (!details.runtime) await this.getIdentityDetails(movie.id, "de-DE");
      await this.loadDirectorAliases(
        directorClaims,
        details.credits?.crew ?? [],
      );
    };
    const scoredCandidates: TmdbScoredMatch[] = [];
    const searchCandidates = new Map<number, TmdbMovieSearchResult>();

    const searchPromises = (evidence.tmdbId ? [] : queries).map((query) =>
      this.rateLimitQueue.run(async () => {
        const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
        searchUrl.searchParams.set("api_key", env.TMDB_API_KEY);
        searchUrl.searchParams.set("query", query);
        searchUrl.searchParams.set("language", "de-DE");
        searchUrl.searchParams.set("include_adult", "false");
        searchUrl.searchParams.set("page", "1");
        // Broaden discovery only; scoring still rejects a year mismatch unless
        // the independently recorded theatrical date and all identity checks agree.
        if (requestedYear && !canCorroborateTheatricalRelease) {
          searchUrl.searchParams.set(
            evidence.productionYear && !titleYear
              ? "year"
              : "primary_release_year",
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
    if (evidence.tmdbId) {
      // An explicit native ID selects a candidate, not an unconditional match.
      // It still goes through the same title, year, director and runtime checks.
      const details = await this.rateLimitQueue.run(async () => {
        const url = new URL(
          `https://api.themoviedb.org/3/movie/${evidence.tmdbId}`,
        );
        url.searchParams.set("api_key", env.TMDB_API_KEY);
        url.searchParams.set("language", "de-DE");
        url.searchParams.set(
          "append_to_response",
          "credits,release_dates,videos",
        );
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error(
            `TMDB native identity failed (${response.status}) for ${evidence.tmdbId}`,
          );
        const value = (await response.json()) as TmdbMovieDetailsResponse;
        if (
          value.id !== evidence.tmdbId ||
          !value.title ||
          !value.original_title
        )
          throw new Error(
            "TMDB native identity response does not match requested movie",
          );
        return value;
      });
      this.detailsCache.set(`${details.id}:de-DE`, details);
      await this.getIdentityDetails(details.id);
      results.push({
        query: `tmdb:${details.id}`,
        result: {
          results: [
            { ...details, genre_ids: details.genres.map((genre) => genre.id) },
          ],
        },
      });
    }

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
        await loadSourceTitleAliases(movieResult);
        await loadTheatricalReleaseEvidence(
          movieResult,
          officialAliases.get(movieResult.id),
        );
        if (
          evidence.youtubeTrailerIds?.length &&
          evidence.originalTitle &&
          evidence.productionYear ===
            extractYear(movieResult.release_date ?? "") &&
          [movieResult.title, movieResult.original_title].some(
            (alias) =>
              normalizeTitleOrdinals(
                normalizeMovieTitle(alias).normalizedTitle,
              ) === normalizeTitleOrdinals(normalizedMovieTitleForSearch),
          )
        ) {
          const details = await this.getIdentityDetails(movieResult.id);
          await this.loadDirectorAliases(
            directorClaims,
            details.credits?.crew ?? [],
          );
        }
        if (
          !titleYear &&
          !evidence.tmdbId &&
          evidence.productionYear &&
          evidence.runtimeMinutes &&
          extractYear(movieResult.release_date ?? "") ===
            evidence.productionYear + 1 &&
          [movieResult.title, movieResult.original_title].some(
            (alias) =>
              normalizeTitleOrdinals(
                normalizeMovieTitle(alias).normalizedTitle,
              ) === normalizeTitleOrdinals(normalizedMovieTitleForSearch),
          )
        ) {
          // A festival premiere can predate the primary theatrical release.
          // Fetch authoritative dates rather than assuming a year tolerance.
          await this.getIdentityDetails(movieResult.id);
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
    // Resolve official aliases for unresolved titles, ambiguity and local-date
    // corroboration. Keep retrieval bounded to seven identities; discovery
    // across years does not waive the final year and identity checks.
    if (
      !performance &&
      ((canCorroborateTheatricalRelease &&
        [...searchCandidates.values()].some(
          (movie) => extractYear(movie.release_date ?? "") !== requestedYear,
        )) ||
        ((evidence.originalTitle ||
          getMovieTitleCandidates(normalizedMovieTitleForSearch).length > 1 ||
          /\b\d+\b/.test(
            normalizeTitleOrdinals(normalizedMovieTitleForSearch),
          )) &&
          ![...byTmdbId.values()].some(
            (candidate) =>
              candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
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
            canCorroborateTheatricalRelease ||
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
        const evidenceAliases = [
          ...(officialAliases.get(candidate.id) ?? []),
          ...aliases,
        ];
        // Both halves of a bilingual title must be recorded names of this film.
        // Matching identity metadata cannot establish an unknown translation
        // or justify discarding a named installment.
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
          parts[0] !== parts[1]
        ) {
          const officialTranslation = [
            candidate.title,
            candidate.original_title,
            ...aliases,
          ].some((alias) =>
            getMovieTitleCandidates(alias).some(
              (variant) => normalizeTitleOrdinals(variant) === parts[1],
            ),
          );
          if (officialTranslation)
            evidenceAliases.push(normalizedMovieTitleForSearch);
        }
        await loadTheatricalReleaseEvidence(candidate, evidenceAliases);
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
    if (directorClaims.length || evidence.runtimeMinutes) {
      // Check after alias retrieval, so aliases cannot bypass constraints.
      for (const candidate of [...byTmdbId.values()].filter(
        (candidate) => candidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE,
      )) {
        const details = await this.getIdentityDetails(candidate.tmdbMovieId);
        const directors =
          details.credits?.crew
            .filter((person) => person.job === "Director")
            .map((person) => person.name) ?? [];
        await this.loadDirectorAliases(
          directorClaims,
          details.credits?.crew ?? [],
        );
        const directorConflict = Boolean(
          directorClaims.length &&
          directors.length &&
          !this.matchesDirectors(directorClaims, details.credits?.crew ?? []),
        );
        const identityTitles = [
          candidate.title,
          candidate.originalTitle,
          ...(officialAliases.get(candidate.tmdbMovieId) ?? []),
        ].map((alias) =>
          normalizeTitleOrdinals(normalizeMovieTitle(alias).normalizedTitle),
        );
        let runtimeConflict = Boolean(
          evidence.runtimeMinutes &&
          details.runtime &&
          Math.abs(details.runtime - evidence.runtimeMinutes) > 5 &&
          // An explicitly advertised extended cut can be longer than TMDB's
          // theatrical cut, but it must corroborate the full film identity.
          !(
            (evidence.edition === "extended" ||
              normalizeMovieTitle(title).tags.some((tag) =>
                /^extended(?: version| edition)?$/i.test(tag),
              )) &&
            evidence.runtimeMinutes > details.runtime &&
            evidence.originalTitle &&
            hasFullAlias(candidate)
          ),
        );
        if (
          runtimeConflict &&
          !directorConflict &&
          identityTitles.includes(
            normalizeTitleOrdinals(normalizedMovieTitleForSearch),
          )
        ) {
          // TMDB can report a different regional runtime for the same film.
          // Keep the same tolerance; neither language replaces the other.
          const regionalDetails = await this.getIdentityDetails(
            candidate.tmdbMovieId,
            "de-DE",
          );
          // A shared official trailer identifies the film despite a runtime
          // disagreement. It cannot replace either full title,
          // known director agreement, year constraints or ambiguity checks.
          const corroboratedTrailer = Boolean(
            !performance &&
            evidence.originalTitle &&
            identityTitles.includes(
              normalizeTitleOrdinals(evidence.originalTitle),
            ) &&
            directorClaims.length &&
            directors.length &&
            (matchesOfficialTrailer(details.videos) ||
              matchesOfficialTrailer(regionalDetails.videos)),
          );
          if (
            corroboratedTrailer ||
            (regionalDetails.runtime &&
              Math.abs(regionalDetails.runtime - evidence.runtimeMinutes!) <= 5)
          )
            runtimeConflict = false;
        }
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
          : bestCandidate &&
              bestCandidate.confidence >= env.TMDB_MIN_CONFIDENCE_SCORE &&
              !bestCandidate.posterPath
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

  private matchesDirectors(
    claims: string[],
    crew: NonNullable<TmdbMovieDetailsResponse["credits"]>["crew"],
  ) {
    const names = new Set(
      crew
        .filter((person) => person.job === "Director")
        .flatMap((person) => [
          person.name,
          ...(this.personAliasCache.get(person.id) ?? []),
        ])
        .map(normalizeForComparison),
    );
    return claims.some((claim) => {
      if (names.has(normalizeForComparison(claim))) return true;
      const requested = claim.split(/\s*[/;&,]\s*|\s+(?:und|and)\s+/i);
      return requested.every(
        (name) =>
          Boolean(name.trim()) && names.has(normalizeForComparison(name)),
      );
    });
  }

  private async loadDirectorAliases(
    claims: string[],
    crew: NonNullable<TmdbMovieDetailsResponse["credits"]>["crew"],
  ) {
    if (!claims.length || this.matchesDirectors(claims, crew)) return;
    for (const person of crew.filter((person) => person.job === "Director")) {
      if (
        !Number.isSafeInteger(person.id) ||
        person.id <= 0 ||
        this.personAliasCache.has(person.id)
      )
        continue;
      const aliases = await this.rateLimitQueue.run(async () => {
        const url = new URL(`https://api.themoviedb.org/3/person/${person.id}`);
        url.searchParams.set("api_key", env.TMDB_API_KEY);
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error(
            `TMDB person aliases failed (${response.status}) for ${person.id}`,
          );
        const data = (await response.json()) as {
          id: number;
          also_known_as?: string[];
        };
        if (data.id !== person.id)
          throw new Error(
            "TMDB person aliases response does not match requested person",
          );
        return data.also_known_as ?? [];
      });
      this.personAliasCache.set(person.id, aliases);
      if (this.matchesDirectors(claims, crew)) return;
    }
  }

  private async getIdentityDetails(tmdbMovieId: number, language = "") {
    const cacheKey = `${tmdbMovieId}:${language}`;
    const cached = this.detailsCache.get(cacheKey);
    if (cached) return cached;
    const details = await this.rateLimitQueue.run(async () => {
      const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbMovieId}`);
      url.searchParams.set("api_key", env.TMDB_API_KEY);
      if (language) url.searchParams.set("language", language);
      url.searchParams.set(
        "append_to_response",
        "credits,release_dates,videos",
      );
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error(
          `TMDB identity details failed (${response.status}) for ${tmdbMovieId}`,
        );
      return (await response.json()) as Pick<
        TmdbMovieDetailsResponse,
        "runtime" | "credits" | "release_dates" | "videos"
      >;
    });
    this.detailsCache.set(cacheKey, details);
    return details;
  }
}
