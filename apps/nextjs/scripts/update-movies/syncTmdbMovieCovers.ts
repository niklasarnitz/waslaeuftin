import type { TmdbMovieDetailsResponse } from "@waslaeuftin/types/TmdbMovieDetailsResponse";
import type { TmdbScoredMatch } from "@waslaeuftin/types/TmdbScoredMatch";
import type { UploadedCover } from "@waslaeuftin/types/UploadedCover";
import {
  normalizeForComparison,
  normalizeMovieTitle,
  normalizePrefix,
} from "@waslaeuftin/core";
import { db } from "@waslaeuftin/db/client";
import { env } from "@waslaeuftin/env";
import { assertBucketAccessible } from "@waslaeuftin/helpers/fileStorage/assertBucketAccessible";
import { createS3Client } from "@waslaeuftin/helpers/fileStorage/createS3Client";
import { uploadTmdbPosterToS3 } from "@waslaeuftin/helpers/fileStorage/uploadTmdbPosterToS3";
import { upsertTmdbMetadata } from "@waslaeuftin/helpers/fileStorage/upsertTmdbMetadata";
import { scoreTmdbCandidate } from "@waslaeuftin/helpers/similarity/scoreTmdbCandidate";
import { buildTmdbSearchQueries } from "@waslaeuftin/helpers/tmdb/buildTmdbSearchQueries";
import { fetchTmdbMovieDetails } from "@waslaeuftin/helpers/tmdb/fetchTmdbMovieDetails";

type TmdbMovieSearchResponse = {
  results: TmdbMovieSearchResult[];
};

type TmdbMovieSearchResult = {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  video: boolean;
  genre_ids: number[];
};

export type TmdbMatchEvaluation = {
  requestedTitle: string;
  normalizedTitle: string;
  threshold: number;
  bestCandidate: TmdbScoredMatch | null;
  acceptedCandidate: TmdbScoredMatch | null;
};

type SyncMovieCoversResult = {
  consideredMovies: number;
  updatedMovies: number;
  skippedExistingCover: number;
  skippedNoPoster: number;
  skippedNoTmdbMatch: number;
  skippedLowConfidence: number;
};

const sanitizeWhitespace = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const getBigramSet = (value: string) => {
  const compact = value.replace(/\s+/g, "");

  if (compact.length < 2) {
    return new Set([compact]);
  }

  const bigrams = new Set<string>();

  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.add(compact.slice(index, index + 2));
  }

  return bigrams;
};

const getDiceSimilarity = (left: string, right: string) => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftBigrams = getBigramSet(left);
  const rightBigrams = getBigramSet(right);
  let overlap = 0;

  for (const bigram of leftBigrams) {
    if (rightBigrams.has(bigram)) {
      overlap += 1;
    }
  }

  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
};

const getTokenOverlapScore = (left: string, right: string) => {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const clampScore = (value: number) => {
  return Math.max(0, Math.min(1, value));
};

const extractYear = (value: string) => {
  const yearMatch = value.match(/\b(19|20)\d{2}\b/);

  return yearMatch ? Number(yearMatch[0]) : null;
};

class TmdbMovieMatcher {
  private readonly searchCache = new Map<string, TmdbMatchEvaluation>();

  async evaluate(title: string): Promise<TmdbMatchEvaluation> {
    const normalizedTitle = normalizeForComparison(
      normalizeMovieTitle(title).normalizedTitle,
    );
    const cacheKey = normalizedTitle || normalizeForComparison(title);

    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        requestedTitle: title,
      };
    }

    const queries = buildTmdbSearchQueries(
      title,
      normalizeMovieTitle(title).normalizedTitle,
    );
    const scoredCandidates: TmdbScoredMatch[] = [];

    for (const query of queries) {
      const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
      searchUrl.searchParams.set("api_key", env.TMDB_API_KEY);
      searchUrl.searchParams.set("query", query);
      searchUrl.searchParams.set("language", "de-DE");
      searchUrl.searchParams.set("include_adult", "false");
      searchUrl.searchParams.set("page", "1");

      const searchResponse = await fetch(searchUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!searchResponse.ok) {
        throw new Error(
          `TMDB search failed (${searchResponse.status}) for query "${query}"`,
        );
      }

      const payload = (await searchResponse.json()) as TmdbMovieSearchResponse;
      const topResults = payload.results.slice(0, 7);

      for (const result of topResults) {
        scoredCandidates.push({
          tmdbMovieId: result.id,
          title: result.title,
          originalTitle: result.original_title,
          posterPath: result.poster_path,
          releaseDate: result.release_date,
          popularity: result.popularity,
          confidence: scoreTmdbCandidate(normalizedTitle, result),
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

    const bestCandidate =
      Array.from(byTmdbId.values()).sort(
        (left, right) => right.confidence - left.confidence,
      )[0] ?? null;

    const acceptedCandidate =
      bestCandidate &&
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
    };

    this.searchCache.set(cacheKey, evaluation);

    return evaluation;
  }
}

export const syncTmdbMovieCoversForAllMovies = async (options?: {
  forceRefreshExistingCovers?: boolean;
  unmatchedOnly?: boolean;
}): Promise<SyncMovieCoversResult> => {
  const matcher = new TmdbMovieMatcher();
  const s3Client = createS3Client();
  const normalizedPrefix = normalizePrefix(env.S3_MOVIE_COVERS_PREFIX);
  const uploadedPosterCache = new Map<string, UploadedCover>();

  await assertBucketAccessible(s3Client);

  const unmatchedOnly = options?.unmatchedOnly ?? false;

  const allMovies = await db.movie.findMany({
    where: unmatchedOnly ? { tmdbMovieId: null } : undefined,
    select: {
      id: true,
      name: true,
      coverUrl: true,
      tmdbMovieId: true,
    },
  });

  const result: SyncMovieCoversResult = {
    consideredMovies: allMovies.length,
    updatedMovies: 0,
    skippedExistingCover: 0,
    skippedNoPoster: 0,
    skippedNoTmdbMatch: 0,
    skippedLowConfidence: 0,
  };

  const forceRefreshExistingCovers =
    options?.forceRefreshExistingCovers ?? false;

  console.info(
    `[TMDB Cover Sync] Found ${allMovies.length} movies to evaluate (forceRefreshExistingCovers=${forceRefreshExistingCovers})`,
  );

  for (const [index, movie] of allMovies.entries()) {
    console.info(
      `[TMDB Cover Sync] [${index + 1}/${allMovies.length}] Processing: ${movie.name}`,
    );

    if (!forceRefreshExistingCovers && movie.coverUrl && movie.tmdbMovieId) {
      result.skippedExistingCover += 1;
      console.info(
        `[TMDB Cover Sync]   → Skipped (existing cover & TMDB match)`,
      );
      continue;
    }

    const evaluation = await matcher.evaluate(movie.name);

    if (!evaluation.bestCandidate) {
      result.skippedNoTmdbMatch += 1;
      console.info(`[TMDB Cover Sync]   → Skipped (no TMDB match)`);
      continue;
    }

    if (evaluation.bestCandidate.confidence < evaluation.threshold) {
      result.skippedLowConfidence += 1;
      console.info(
        `[TMDB Cover Sync]   → Skipped (low confidence: ${evaluation.bestCandidate.confidence.toFixed(3)} < ${evaluation.threshold})`,
      );
      continue;
    }

    if (!evaluation.acceptedCandidate?.posterPath) {
      result.skippedNoPoster += 1;
      console.info(`[TMDB Cover Sync]   → Skipped (no poster)`);
      continue;
    }

    const uploadedCover = await uploadTmdbPosterToS3(
      s3Client,
      movie.name,
      evaluation.acceptedCandidate,
      normalizedPrefix,
      uploadedPosterCache,
    );

    let tmdbMetadataStored = false;

    try {
      const details = await fetchTmdbMovieDetails(
        evaluation.acceptedCandidate.tmdbMovieId,
      );
      await upsertTmdbMetadata(details);
      tmdbMetadataStored = true;
    } catch (error) {
      console.warn(
        `[TMDB Cover Sync]   → Warning: Could not fetch/store TMDB metadata for movie ${evaluation.acceptedCandidate.tmdbMovieId}:`,
        error,
      );
    }

    const targetTmdbMovieId = evaluation.acceptedCandidate.tmdbMovieId;

    const existingMovieWithTmdbId = tmdbMetadataStored
      ? await db.movie.findFirst({
          where: {
            tmdbMovieId: targetTmdbMovieId,
            id: { not: movie.id },
          },
          select: { id: true, name: true },
        })
      : null;

    if (existingMovieWithTmdbId) {
      console.info(
        `[TMDB Cover Sync]   → tmdbMovieId ${targetTmdbMovieId} already assigned to movie ${existingMovieWithTmdbId.id} ("${existingMovieWithTmdbId.name}"). Merging showings.`,
      );

      const showingsToMove = await db.showing.findMany({
        where: { movieId: movie.id },
        select: { id: true, cinemaId: true, dateTime: true },
      });

      for (const showing of showingsToMove) {
        const existingTargetShowing = await db.showing.findUnique({
          where: {
            cinemaId_movieId_dateTime: {
              cinemaId: showing.cinemaId,
              movieId: existingMovieWithTmdbId.id,
              dateTime: showing.dateTime,
            },
          },
          select: { id: true },
        });

        if (existingTargetShowing) {
          await db.showing.delete({ where: { id: showing.id } });
        } else {
          await db.showing.update({
            where: { id: showing.id },
            data: { movieId: existingMovieWithTmdbId.id },
          });
        }
      }

      try {
        await db.movie.delete({ where: { id: movie.id } });
      } catch {
        await db.movie.update({
          where: { id: movie.id },
          data: {
            coverUrl: uploadedCover.publicUrl,
            coverStorageKey: uploadedCover.objectKey,
            coverConfidence: evaluation.acceptedCandidate.confidence,
          },
        });
      }
    } else {
      await db.movie.update({
        where: { id: movie.id },
        data: {
          coverUrl: uploadedCover.publicUrl,
          coverStorageKey: uploadedCover.objectKey,
          coverConfidence: evaluation.acceptedCandidate.confidence,
          ...(tmdbMetadataStored ? { tmdbMovieId: targetTmdbMovieId } : {}),
        },
      });
    }

    result.updatedMovies += 1;
    console.info(
      `[TMDB Cover Sync]   → Updated with confidence=${evaluation.acceptedCandidate.confidence.toFixed(3)}`,
    );
  }

  return result;
};

const sharedMatcher = new TmdbMovieMatcher();

export const evaluateMovieTitleAgainstTmdb = async (title: string) => {
  return sharedMatcher.evaluate(title);
};
