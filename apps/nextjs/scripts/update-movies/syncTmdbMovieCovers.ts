import type { UploadedCover } from "@waslaeuftin/types/UploadedCover";
import { normalizePrefix } from "@waslaeuftin/core";
import { db } from "@waslaeuftin/db/client";
import { env } from "@waslaeuftin/env";
import { assertBucketAccessible } from "@waslaeuftin/helpers/fileStorage/assertBucketAccessible";
import { createS3Client } from "@waslaeuftin/helpers/fileStorage/createS3Client";
import { POSTER_UPLOAD_CONCURRENCY } from "@waslaeuftin/helpers/fileStorage/posterUploadConcurrency";
import { uploadTmdbPosterToS3 } from "@waslaeuftin/helpers/fileStorage/uploadTmdbPosterToS3";
import { upsertTmdbMetadata } from "@waslaeuftin/helpers/fileStorage/upsertTmdbMetadata";
import { RateLimitedQueue } from "@waslaeuftin/helpers/RateLimitedQueue";
import { fetchTmdbMovieDetails } from "@waslaeuftin/helpers/tmdb/fetchTmdbMovieDetails";
import { TmdbMovieMatcher } from "@waslaeuftin/helpers/tmdb/TmdbMovieMatcher";

type SyncMovieCoversResult = {
  consideredMovies: number;
  updatedMovies: number;
  skippedExistingCover: number;
  skippedNoPoster: number;
  skippedNoTmdbMatch: number;
  skippedLowConfidence: number;
  failedUploads: number;
};

export const syncTmdbMovieCoversForAllMovies = async (options?: {
  forceRefreshExistingCovers?: boolean;
  unmatchedOnly?: boolean;
}): Promise<SyncMovieCoversResult> => {
  const matcher = new TmdbMovieMatcher();
  const s3Client = createS3Client();
  const normalizedPrefix = normalizePrefix(env.S3_MOVIE_COVERS_PREFIX);
  const uploadedPosterCache = new Map<string, Promise<UploadedCover>>();

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
    failedUploads: 0,
  };

  const forceRefreshExistingCovers =
    options?.forceRefreshExistingCovers ?? false;

  console.info(
    `[TMDB Cover Sync] Found ${allMovies.length} movies to evaluate (forceRefreshExistingCovers=${forceRefreshExistingCovers})`,
  );

  const moviesToProcess = allMovies.filter(
    (movie) =>
      forceRefreshExistingCovers || !movie.coverUrl || !movie.tmdbMovieId,
  );
  result.skippedExistingCover = allMovies.length - moviesToProcess.length;

  // Phase 1: TMDB matching and poster uploads are network-bound and run in
  // parallel. Database writes (incl. merges) stay sequential in phase 2.
  const workQueue = new RateLimitedQueue(POSTER_UPLOAD_CONCURRENCY, 0);
  const prepared = await Promise.all(
    moviesToProcess.map((movie) =>
      workQueue.run(async () => {
        const evaluation = await matcher.evaluate(movie.name);
        const match = evaluation.acceptedCandidate;

        if (!match?.posterPath) {
          return { movie, evaluation, uploadedCover: null };
        }

        try {
          const uploadedCover = await uploadTmdbPosterToS3(
            s3Client,
            movie.name,
            match,
            normalizedPrefix,
            uploadedPosterCache,
          );
          return { movie, evaluation, uploadedCover };
        } catch (error) {
          return { movie, evaluation, uploadedCover: null, error };
        }
      }),
    ),
  );

  for (const [index, entry] of prepared.entries()) {
    const { movie, evaluation, uploadedCover } = entry;

    console.info(
      `[TMDB Cover Sync] [${index + 1}/${prepared.length}] Processing: ${movie.name}`,
    );

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

    if (!uploadedCover) {
      result.failedUploads += 1;
      console.warn(
        `[TMDB Cover Sync]   → Skipped (poster upload failed):`,
        "error" in entry ? entry.error : undefined,
      );
      continue;
    }

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
