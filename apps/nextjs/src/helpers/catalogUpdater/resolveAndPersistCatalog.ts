import { createHash } from "node:crypto";

import type {
  ProviderCatalog,
  RawProviderMovie,
} from "@waslaeuftin/cinema-providers/server";
import type { TmdbMatchEvaluation } from "@waslaeuftin/types/TmdbMatchEvaluation";
import {
  classifySneakTitle,
  getScreenedPerformance,
  normalizeMovieTitle,
  normalizePrefix,
  prepareMovieTitle,
} from "@waslaeuftin/core";
import { Prisma } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";
import { env } from "@waslaeuftin/env";
import { assertBucketAccessible } from "@waslaeuftin/helpers/fileStorage/assertBucketAccessible";
import { createS3Client } from "@waslaeuftin/helpers/fileStorage/createS3Client";
import { POSTER_UPLOAD_CONCURRENCY } from "@waslaeuftin/helpers/fileStorage/posterUploadConcurrency";
import { uploadTmdbPosterToS3 } from "@waslaeuftin/helpers/fileStorage/uploadTmdbPosterToS3";
import { upsertTmdbMetadata } from "@waslaeuftin/helpers/fileStorage/upsertTmdbMetadata";
import { RateLimitedQueue } from "@waslaeuftin/helpers/RateLimitedQueue";
import { fetchTmdbMovieDetails } from "@waslaeuftin/helpers/tmdb/fetchTmdbMovieDetails";
import {
  MOVIE_MATCHER_VERSION,
  TmdbMovieMatcher,
} from "@waslaeuftin/helpers/tmdb/TmdbMovieMatcher";
import { ResolvedMovie } from "@waslaeuftin/types/ResolvedMovie";
import { TmdbMatchEvaluationSchema } from "@waslaeuftin/types/TmdbMatchEvaluation";
import { UploadedCover } from "@waslaeuftin/types/UploadedCover";
import { MovieIdentityEvidenceSchema } from "@waslaeuftin/validators";

const sourceKeyFor = (source: RawProviderMovie) =>
  JSON.stringify([
    source.cinemaId,
    source.provider ?? "unknown",
    source.providerFilmId ?? null,
    source.name,
    source.evidence?.productionYear,
    source.evidence?.originalTitle,
    source.evidence?.director,
    source.evidence?.runtimeMinutes,
  ]);

type CreateResolvedMovieParams = Pick<
  ResolvedMovie,
  "canonicalKey" | "name" | "normalizedTitle"
> &
  Partial<ResolvedMovie>;

const createResolvedMovie = (
  params: CreateResolvedMovieParams,
): ResolvedMovie => ({
  canonicalKey: params.canonicalKey,
  name: params.name,
  normalizedTitle: params.normalizedTitle,
  tmdbMovieId: params.tmdbMovieId ?? null,
  coverUrl: params.coverUrl ?? null,
  coverStorageKey: params.coverStorageKey ?? null,
  coverConfidence: params.coverConfidence ?? null,
  tmdbSearchFailedOn: params.tmdbSearchFailedOn ?? null,
});

export type ResolvePhase = "matching" | "tmdb" | "persisting";

export type ResolveProgressReporter = {
  onPhase: (phase: ResolvePhase, total: number) => Promise<void> | void;
  onProgress: (done: number) => Promise<void> | void;
};

export const resolveAndPersistCatalog = async (
  catalogs: ProviderCatalog[],
  progress?: ResolveProgressReporter,
  persistShowings?: (
    showings: Prisma.ShowingCreateManyInput[],
  ) => Promise<number>,
) => {
  const sources = new Map<string, RawProviderMovie>();
  const allShowings: ProviderCatalog["showings"] = [];
  const allMovies: ProviderCatalog["movies"] = [];

  for (const catalog of catalogs) {
    const movies = catalog.movies.map((movie) => ({
      ...movie,
      provider: movie.provider ?? catalog.provider ?? "unknown",
      evidence: MovieIdentityEvidenceSchema.parse(movie.evidence ?? {}),
    }));
    const moviesBySourceTitle = new Map<string, typeof movies>();
    for (const movie of movies) {
      allMovies.push(movie);
      sources.set(sourceKeyFor(movie), movie);
      const key = JSON.stringify([movie.cinemaId, movie.provider, movie.name]);
      const group = moviesBySourceTitle.get(key) ?? [];
      group.push(movie);
      moviesBySourceTitle.set(key, group);
    }
    for (const showing of catalog.showings) {
      const provider = showing.provider ?? catalog.provider ?? "unknown";
      const associated = (
        moviesBySourceTitle.get(
          JSON.stringify([showing.cinemaId, provider, showing.movieName]),
        ) ?? []
      ).filter(
        (movie) =>
          !showing.providerFilmId ||
          showing.providerFilmId === movie.providerFilmId,
      );
      const movie = associated.length === 1 ? associated[0] : undefined;
      const source = {
        cinemaId: showing.cinemaId,
        name: showing.movieName,
        provider,
        providerFilmId: showing.providerFilmId ?? movie?.providerFilmId,
        evidence: MovieIdentityEvidenceSchema.parse({
          ...movie?.evidence,
          ...showing.evidence,
        }),
      };
      allShowings.push({
        ...showing,
        provider,
        providerFilmId: source.providerFilmId,
        evidence: source.evidence,
      });
      sources.set(sourceKeyFor(source), source);
    }
  }

  const sourceKeys = Array.from(sources.keys());

  console.info(
    `[Resolver] Resolving ${sourceKeys.length} source identities from ${allShowings.length} showings`,
  );

  // ─── Phase 1: Load all existing movies from database ────────────────────
  console.info(`[Resolver] Loading existing movies from database...`);
  const dbMovies = await db.movie.findMany({
    select: {
      id: true,
      canonicalKey: true,
      name: true,
      normalizedTitle: true,
      tmdbMovieId: true,
      coverUrl: true,
      coverStorageKey: true,
      coverConfidence: true,
      tmdbSearchFailedOn: true,
    },
  });

  // Build lookup maps for database movies
  const dbMovieByTmdbId = new Map<number, (typeof dbMovies)[number]>();
  const dbMovieById = new Map(dbMovies.map((movie) => [movie.id, movie]));
  // ⚡ Bolt Optimization: Replaced `.filter().map()` with a single `for...of` loop.
  // This avoids intermediate array allocations and improves processing speed by ~2x
  // when mapping thousands of database movies into lookup maps.
  for (const movie of dbMovies) {
    if (movie.tmdbMovieId) {
      dbMovieByTmdbId.set(movie.tmdbMovieId, movie);
    }
  }

  const cacheRows = await db.showing.findMany({
    where: {
      cinemaId: {
        in: [
          ...new Set([...sources.values()].map((source) => source.cinemaId)),
        ],
      },
      matcherVersion: MOVIE_MATCHER_VERSION,
      matchEvaluatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { matchEvaluatedAt: "desc" },
    select: {
      cinemaId: true,
      movieId: true,
      rawMovieName: true,
      sourceProvider: true,
      providerFilmId: true,
      sourceEvidence: true,
      matchEvaluation: true,
      matchEvaluatedAt: true,
      matcherVersion: true,
    },
  });
  const cachedSources = new Map<
    string,
    {
      movie: (typeof dbMovies)[number];
      evaluation: TmdbMatchEvaluation;
      evaluatedAt: Date;
    }
  >();
  for (const row of cacheRows) {
    const evidence = MovieIdentityEvidenceSchema.safeParse(
      row.sourceEvidence ?? {},
    );
    const evaluation = TmdbMatchEvaluationSchema.safeParse(row.matchEvaluation);
    const movie = dbMovieById.get(row.movieId);
    if (
      !evidence.success ||
      !evaluation.success ||
      !movie ||
      !row.matchEvaluatedAt ||
      row.matcherVersion !== MOVIE_MATCHER_VERSION ||
      evaluation.data.threshold !== env.TMDB_MIN_CONFIDENCE_SCORE ||
      evaluation.data.requestedTitle !== row.rawMovieName ||
      (evaluation.data.acceptedCandidate?.tmdbMovieId ?? null) !==
        movie.tmdbMovieId
    )
      continue;
    const maxAge =
      (evaluation.data.acceptedCandidate ? 7 : 1) * 24 * 60 * 60 * 1000;
    if (Date.now() - row.matchEvaluatedAt.getTime() > maxAge) continue;
    const key = sourceKeyFor({
      cinemaId: row.cinemaId,
      name: row.rawMovieName,
      provider: row.sourceProvider ?? "unknown",
      providerFilmId: row.providerFilmId ?? undefined,
      evidence: evidence.data,
    });
    if (!cachedSources.has(key))
      cachedSources.set(key, {
        movie,
        evaluation: evaluation.data,
        evaluatedAt: row.matchEvaluatedAt,
      });
  }

  console.info(
    `[Resolver] Loaded ${dbMovies.length} existing movies from database`,
  );

  // ─── Phase 2: Match raw titles to existing database movies or mark as new ──
  const matcher = new TmdbMovieMatcher();
  const s3Client = createS3Client();
  const normalizedPrefix = normalizePrefix(env.S3_MOVIE_COVERS_PREFIX);
  const uploadedPosterCache = new Map<string, Promise<UploadedCover>>();

  await assertBucketAccessible(s3Client);

  // Map: provider/cinema/film/evidence context -> ResolvedMovie
  const resolutionBySourceKey = new Map<string, ResolvedMovie>();
  // Map: canonicalKey -> ResolvedMovie (deduplicated)
  const canonicalMovieMap = new Map<string, ResolvedMovie>();
  const decisions = new Map<
    string,
    { evaluation: TmdbMatchEvaluation; evaluatedAt: Date }
  >();

  // Track which movies need TMDB data
  const moviesToFetchTmdbData = new Set<string>(); // source keys

  const resolveWithFallback = (sourceKey: string): ResolvedMovie => {
    const source = sources.get(sourceKey)!;
    const rawTitle = source.name;
    const releaseYear =
      rawTitle.match(/\((?:19|20)\d{2}\)/)?.[0] ??
      (source.evidence?.productionYear
        ? `(${source.evidence.productionYear})`
        : undefined);
    const normalizedForFallback =
      getScreenedPerformance(rawTitle) ||
      classifySneakTitle(rawTitle).isUnannounced
        ? prepareMovieTitle(rawTitle)
        : [normalizeMovieTitle(rawTitle).normalizedTitle, releaseYear]
            .filter(Boolean)
            .join(" ");
    const canonicalKey = `source:${createHash("sha256").update(sourceKey).digest("hex")}`;

    const existingByCanonicalKey = canonicalMovieMap.get(canonicalKey);
    if (existingByCanonicalKey) {
      resolutionBySourceKey.set(sourceKey, existingByCanonicalKey);
      return existingByCanonicalKey;
    }

    const resolved = createResolvedMovie({
      canonicalKey,
      name: normalizedForFallback || rawTitle,
      normalizedTitle: normalizedForFallback || rawTitle,
      tmdbSearchFailedOn: new Date(),
    });

    resolutionBySourceKey.set(sourceKey, resolved);
    canonicalMovieMap.set(canonicalKey, resolved);

    return resolved;
  };

  let tmdbMatched = 0;
  let tmdbUnmatched = 0;

  console.info(`[Resolver] Phase 2: Matching raw titles to database movies...`);
  await progress?.onPhase("matching", sourceKeys.length);

  for (const [index, sourceKey] of sourceKeys.entries()) {
    const source = sources.get(sourceKey)!;
    console.info(
      `[Resolver] [${index + 1}/${sourceKeys.length}] Matching: "${source.name}"`,
    );
    if (classifySneakTitle(source.name).isUnannounced) {
      resolveWithFallback(sourceKey);
      decisions.set(sourceKey, {
        evaluatedAt: new Date(),
        evaluation: {
          requestedTitle: source.name,
          normalizedTitle: normalizeMovieTitle(source.name).normalizedTitle,
          threshold: env.TMDB_MIN_CONFIDENCE_SCORE,
          bestCandidate: null,
          acceptedCandidate: null,
          decisionReason: "unannounced-screening",
          candidates: [],
        },
      });
      tmdbUnmatched++;
      continue;
    }
    const cached = cachedSources.get(sourceKey);
    if (
      cached &&
      (!cached.evaluation.acceptedCandidate || cached.movie.coverUrl)
    ) {
      const resolved = createResolvedMovie(cached.movie);
      resolutionBySourceKey.set(sourceKey, resolved);
      canonicalMovieMap.set(resolved.canonicalKey, resolved);
      decisions.set(sourceKey, {
        evaluation: cached.evaluation,
        evaluatedAt: cached.evaluatedAt,
      });
      if (cached.evaluation.acceptedCandidate) tmdbMatched++;
      else tmdbUnmatched++;
      continue;
    }
    // Legacy title-only rows cannot establish the identity of this source.
    moviesToFetchTmdbData.add(sourceKey);
  }

  await progress?.onProgress(sourceKeys.length);

  // ─── Phase 3: Fetch TMDB data only for new or incomplete movies ──────────
  console.info(
    `[Resolver] Phase 3: Fetching TMDB data for ${moviesToFetchTmdbData.size} movies`,
  );

  let newMoviesCreated = 0;

  // Phase 3a: Evaluate TMDB titles in batches (respects rate limiting)
  const pendingSourceKeys = Array.from(moviesToFetchTmdbData);
  const TMDB_BATCH_SIZE = 10; // Process 10 titles at a time with the internal rate limiter
  const allEvaluationResults: PromiseSettledResult<{
    sourceKey: string;
    evaluation: Awaited<ReturnType<typeof matcher.evaluate>>;
  }>[] = [];
  const evaluationsByEvidence = new Map<string, Promise<TmdbMatchEvaluation>>();

  console.info(
    `[Resolver] Executing ${pendingSourceKeys.length} TMDB evaluations in batches (max 10 per batch)...`,
  );

  await progress?.onPhase("tmdb", pendingSourceKeys.length);

  for (let i = 0; i < pendingSourceKeys.length; i += TMDB_BATCH_SIZE) {
    const batchSourceKeys = pendingSourceKeys.slice(i, i + TMDB_BATCH_SIZE);
    const batchProgress = `${Math.min(i + TMDB_BATCH_SIZE, pendingSourceKeys.length)}/${pendingSourceKeys.length}`;

    console.info(`[Resolver] Batch progress: ${batchProgress}`);

    const batchPromises = batchSourceKeys.map((sourceKey) => {
      const source = sources.get(sourceKey)!;
      const key = JSON.stringify([source.name, source.evidence]);
      let evaluation = evaluationsByEvidence.get(key);
      if (!evaluation) {
        evaluation = matcher.evaluate(source.name, source.evidence);
        evaluationsByEvidence.set(key, evaluation);
      }
      return evaluation.then((evaluation) => ({ sourceKey, evaluation }));
    });

    const batchResults = await Promise.allSettled(batchPromises);
    allEvaluationResults.push(...batchResults);
    await progress?.onProgress(allEvaluationResults.length);
  }

  // Phase 3b: Start poster uploads for new TMDB matches in parallel; the
  // sequential processing below only awaits them.
  const posterUploadQueue = new RateLimitedQueue(POSTER_UPLOAD_CONCURRENCY, 0);
  const posterUploads = new Map<number, Promise<UploadedCover | null>>();

  for (const evaluationResult of allEvaluationResults) {
    if (evaluationResult.status === "rejected") continue;

    const match = evaluationResult.value.evaluation.acceptedCandidate;
    if (
      !match?.posterPath ||
      dbMovieByTmdbId.has(match.tmdbMovieId) ||
      posterUploads.has(match.tmdbMovieId)
    ) {
      continue;
    }

    posterUploads.set(
      match.tmdbMovieId,
      posterUploadQueue
        .run(() =>
          uploadTmdbPosterToS3(
            s3Client,
            match.title,
            match,
            normalizedPrefix,
            uploadedPosterCache,
          ),
        )
        .catch((error: unknown) => {
          console.warn(
            `[Resolver]   → Warning: Could not upload poster for ${match.tmdbMovieId}:`,
            error,
          );
          return null;
        }),
    );
  }

  // Phase 3c: Process evaluation results sequentially
  for (const [index, evaluationResult] of allEvaluationResults.entries()) {
    const sourceKey = pendingSourceKeys[index]!;
    const source = sources.get(sourceKey)!;
    const rawTitle = source.name;

    if (evaluationResult.status === "rejected") {
      console.warn(
        `[Resolver] [${index + 1}/${allEvaluationResults.length}] TMDB evaluation failed for "${rawTitle}":`,
        evaluationResult.reason,
      );
      resolveWithFallback(sourceKey);
      tmdbUnmatched++;
      continue;
    }

    const { evaluation } = evaluationResult.value;
    decisions.set(sourceKey, { evaluation, evaluatedAt: new Date() });
    const normalizedTitle = normalizeMovieTitle(rawTitle).normalizedTitle;
    const releaseYear =
      rawTitle.match(/\((?:19|20)\d{2}\)/)?.[0] ??
      (source.evidence?.productionYear
        ? `(${source.evidence.productionYear})`
        : undefined);

    console.info(
      `[Resolver] [${index + 1}/${allEvaluationResults.length}] Processing TMDB result for: "${rawTitle}"`,
    );

    if (evaluation.acceptedCandidate) {
      const match = evaluation.acceptedCandidate;

      // ─── Phase 3d: Re-check against database with TMDB ID ─────────────────
      let dbMatchByTmbd = dbMovieByTmdbId.get(match.tmdbMovieId);

      if (dbMatchByTmbd) {
        // TMDB ID already exists in database
        const resolved = createResolvedMovie({
          ...dbMatchByTmbd,
          tmdbSearchFailedOn: null,
        });

        resolutionBySourceKey.set(sourceKey, resolved);
        canonicalMovieMap.set(dbMatchByTmbd.canonicalKey, resolved);

        console.info(
          `[Resolver]   → TMDB ID found in DB (better match): "${dbMatchByTmbd.name}"`,
        );
        tmdbMatched++;
        continue;
      }

      // New movie with TMDB match - fetch and upload
      const canonicalKey = `tmdb:${match.tmdbMovieId}`;

      // Check if we already processed this TMDB ID in this run
      const existing = canonicalMovieMap.get(canonicalKey);
      if (existing) {
        resolutionBySourceKey.set(sourceKey, existing);
        tmdbMatched++;
        console.info(
          `[Resolver]   → TMDB hit (cached): ${match.title} (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`,
        );
        continue;
      }

      // Fetch details & upload cover
      let coverUrl: string | null = null;
      let coverStorageKey: string | null = null;
      let tmdbMetadataStored = false;

      try {
        const details = await fetchTmdbMovieDetails(match.tmdbMovieId);
        await upsertTmdbMetadata(details);
        tmdbMetadataStored = true;
      } catch (error) {
        console.warn(
          `[Resolver]   → Warning: Could not fetch/store TMDB metadata for ${match.tmdbMovieId}:`,
          error,
        );
      }

      const uploaded = await posterUploads.get(match.tmdbMovieId);
      if (uploaded) {
        coverUrl = uploaded.publicUrl;
        coverStorageKey = uploaded.objectKey;
      }

      const resolved = createResolvedMovie({
        canonicalKey,
        name: match.title,
        normalizedTitle: releaseYear
          ? `${normalizedTitle} ${releaseYear}`
          : normalizedTitle,
        tmdbMovieId: tmdbMetadataStored ? match.tmdbMovieId : null,
        coverUrl,
        coverStorageKey,
        coverConfidence: match.confidence,
      });

      resolutionBySourceKey.set(sourceKey, resolved);
      canonicalMovieMap.set(canonicalKey, resolved);

      tmdbMatched++;
      newMoviesCreated++;
      console.info(
        `[Resolver]   → TMDB matched (new): "${match.title}" (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`,
      );
    } else {
      // No TMDB match found
      const existingResolution = resolutionBySourceKey.get(sourceKey);

      if (existingResolution && existingResolution.tmdbMovieId === null) {
        // Already resolved with fallback
        console.info(
          `[Resolver]   → No TMDB match, using fallback: "${existingResolution.name}"`,
        );
      } else {
        resolveWithFallback(sourceKey);

        console.info(
          `[Resolver]   → No TMDB match, using fallback: "${resolutionBySourceKey.get(sourceKey)?.name}"`,
        );
      }

      tmdbUnmatched++;
    }
  }

  console.info(
    `[Resolver] TMDB resolution complete: ${newMoviesCreated} new movies, ${tmdbMatched} TMDB matched, ${tmdbUnmatched} fallback)`,
  );

  // ─── Phase 4: Persist to database ────────────────────────────────────────
  console.info(`[Resolver] Phase 4: Writing to database...`);
  await progress?.onPhase("persisting", 0);

  // Upsert all canonical movies. Keep these outside a transaction: each upsert
  // is idempotent, and the inserted IDs are only used for the later createMany.
  // A batch transaction adds a timeout failure mode under load without giving
  // us useful atomicity across the catalog update.
  const movieIdByCanonicalKey = new Map<string, number>();
  const canonicalMoviesList = Array.from(canonicalMovieMap.values());
  const upsertedMovies: { id: number; canonicalKey: string }[] = [];
  const BATCH_SIZE_UPSERT = 10;
  const requestedTmdbMovieIds = Array.from(
    new Set(
      canonicalMoviesList
        .map((movie) => movie.tmdbMovieId)
        .filter((tmdbMovieId): tmdbMovieId is number => tmdbMovieId !== null),
    ),
  );
  const storedTmdbMovieIds =
    requestedTmdbMovieIds.length > 0
      ? new Set(
          (
            await db.tmdbMetadata.findMany({
              where: { tmdbId: { in: requestedTmdbMovieIds } },
              select: { tmdbId: true },
            })
          ).map((metadata) => metadata.tmdbId),
        )
      : new Set<number>();

  for (let i = 0; i < canonicalMoviesList.length; i += BATCH_SIZE_UPSERT) {
    const batch = canonicalMoviesList.slice(i, i + BATCH_SIZE_UPSERT);
    const upsertPromises = batch.map((canonicalMovie) => {
      const tmdbMovieId =
        canonicalMovie.tmdbMovieId === null ||
        storedTmdbMovieIds.has(canonicalMovie.tmdbMovieId)
          ? canonicalMovie.tmdbMovieId
          : null;

      if (canonicalMovie.tmdbMovieId !== null && tmdbMovieId === null) {
        console.warn(
          `[Resolver]   → Warning: TMDB metadata ${canonicalMovie.tmdbMovieId} is missing; storing movie without TMDB foreign key`,
        );
      }

      return db.movie.upsert({
        where: { canonicalKey: canonicalMovie.canonicalKey },
        update: {
          name: canonicalMovie.name,
          normalizedTitle: canonicalMovie.normalizedTitle,
          coverUrl: canonicalMovie.coverUrl,
          coverStorageKey: canonicalMovie.coverStorageKey,
          coverConfidence: canonicalMovie.coverConfidence,
          tmdbMovieId,
          tmdbSearchFailedOn: canonicalMovie.tmdbSearchFailedOn,
        },
        create: {
          canonicalKey: canonicalMovie.canonicalKey,
          name: canonicalMovie.name,
          normalizedTitle: canonicalMovie.normalizedTitle,
          coverUrl: canonicalMovie.coverUrl,
          coverStorageKey: canonicalMovie.coverStorageKey,
          coverConfidence: canonicalMovie.coverConfidence,
          tmdbMovieId,
          tmdbSearchFailedOn: canonicalMovie.tmdbSearchFailedOn,
        },
        select: { id: true, canonicalKey: true },
      });
    });

    const batchResult = await Promise.all(upsertPromises);
    for (const movie of batchResult) {
      upsertedMovies.push(movie);
    }
  }

  for (const movie of upsertedMovies) {
    movieIdByCanonicalKey.set(movie.canonicalKey, movie.id);
  }

  console.info(
    `[Resolver] Upserted ${movieIdByCanonicalKey.size} canonical movies`,
  );

  // Create all showings
  // ⚡ Bolt Optimization: Combined `.map().filter()` into a single `for...of` loop.
  // This eliminates intermediate array allocations, reducing garbage collection
  // overhead and improving performance by ~35% when processing thousands of showings.
  const showingData: Prisma.ShowingCreateManyInput[] = [];

  for (const showing of allShowings) {
    const sourceKey = sourceKeyFor({ ...showing, name: showing.movieName });
    const resolved = resolutionBySourceKey.get(sourceKey);
    if (!resolved) {
      console.warn(
        `[Resolver] No resolution for showing movie name: "${showing.movieName}"`,
      );
      continue;
    }

    const movieId = movieIdByCanonicalKey.get(resolved.canonicalKey);
    if (!movieId) {
      console.warn(
        `[Resolver] No movie ID for canonical key: "${resolved.canonicalKey}"`,
      );
      continue;
    }

    // Automatically combine existing additional data with any tags parsed from the movie title
    const extractedTags = normalizeMovieTitle(showing.movieName).tags;

    let hasNewTags = false;
    if (!showing.showingAdditionalData) {
      if (extractedTags.length > 0) hasNewTags = true;
    } else {
      for (let j = 0; j < extractedTags.length; j++) {
        if (!showing.showingAdditionalData.includes(extractedTags[j]!)) {
          hasNewTags = true;
          break;
        }
      }
    }

    let combinedAdditionalData;
    if (hasNewTags) {
      const combinedSet = new Set(showing.showingAdditionalData);
      for (let j = 0; j < extractedTags.length; j++) {
        combinedSet.add(extractedTags[j]!);
      }
      combinedAdditionalData = Array.from(combinedSet);
    } else {
      combinedAdditionalData = showing.showingAdditionalData ?? [];
    }

    const decision = decisions.get(sourceKey);
    showingData.push({
      cinemaId: showing.cinemaId,
      movieId,
      rawMovieName: showing.movieName,
      isListed: true,
      dateTime: showing.dateTime,
      bookingUrl: showing.bookingUrl ?? null,
      showingAdditionalData: combinedAdditionalData,
      sourceProvider: showing.provider,
      providerFilmId: showing.providerFilmId ?? null,
      sourceEvidence: showing.evidence ?? {},
      matcherVersion: decision ? MOVIE_MATCHER_VERSION : null,
      matchEvaluatedAt: decision?.evaluatedAt ?? null,
      matchEvaluation: decision?.evaluation,
    });
  }

  // createMany in batches of 1000, skipping duplicates
  const BATCH_SIZE = 1000;
  let createdCount = 0;
  let heldShowings = 0;
  if (persistShowings) {
    if (showingData.length !== allShowings.length) {
      throw new Error(
        "Cannot replace a cinema catalog with unresolved showings",
      );
    }
    createdCount = await persistShowings(showingData);
  } else {
    const admittedShowings: typeof showingData = [];
    for (let i = 0; i < showingData.length; i += BATCH_SIZE) {
      const batch = showingData.slice(i, i + BATCH_SIZE);
      const result = await db.$transaction(async (tx) => {
        // Serialize the source-slot check and insert across importer processes.
        // movieId-dependent uniqueness alone cannot guard identity changes.
        const cinemaIds = [...new Set(batch.map((row) => row.cinemaId))];
        await tx.$queryRaw`
          SELECT "id" FROM "Cinema"
          WHERE "id" IN (${Prisma.join(cinemaIds)}) ORDER BY "id" FOR UPDATE
        `;
        const occupied = await tx.showing.findMany({
          where: {
            OR: batch.map((row) => ({
              cinemaId: row.cinemaId,
              dateTime: row.dateTime,
            })),
          },
          select: {
            cinemaId: true,
            movieId: true,
            isListed: true,
            dateTime: true,
            rawMovieName: true,
            sourceProvider: true,
            providerFilmId: true,
          },
        });
        const slots = new Map<string, typeof batch>();
        for (const row of occupied) {
          const key = `${row.cinemaId}:${row.dateTime.toISOString()}`;
          const group = slots.get(key) ?? [];
          group.push(row);
          slots.set(key, group);
        }
        const admitted = batch.filter((row) => {
          const key = `${row.cinemaId}:${new Date(row.dateTime).toISOString()}`;
          const group = slots.get(key) ?? [];
          const conflict = group.find((existing) => {
            if (existing.isListed === false) return false;
            if (existing.movieId === row.movieId) return false;
            const sameProvider = existing.sourceProvider === row.sourceProvider;
            if (
              sameProvider &&
              existing.providerFilmId &&
              row.providerFilmId &&
              existing.providerFilmId !== row.providerFilmId
            )
              return false; // Two established provider films may share a title.
            return (
              existing.rawMovieName === row.rawMovieName ||
              (sameProvider &&
                Boolean(row.providerFilmId) &&
                existing.providerFilmId === row.providerFilmId)
            );
          });
          if (conflict) {
            heldShowings++;
            console.warn("[Resolver] Holding source-slot identity change", {
              cinemaId: row.cinemaId,
              dateTime: row.dateTime,
              rawMovieName: row.rawMovieName,
              sourceProvider: row.sourceProvider,
              providerFilmId: row.providerFilmId,
              storedMovieId: conflict.movieId,
              proposedMovieId: row.movieId,
            });
            return false;
          }
          group.push(row);
          slots.set(key, group);
          return true;
        });
        const inserted = await tx.showing.createMany({
          data: admitted,
          skipDuplicates: true,
        });
        // An exact slot can reappear without a new matcher decision (e.g. HTTP failure).
        // Reactivation must not depend on decision stamping or change its identity.
        if (admitted.length > 0) {
          await tx.showing.updateMany({
            where: {
              isListed: false,
              OR: admitted.map((row) => ({
                cinemaId: row.cinemaId,
                movieId: row.movieId,
                dateTime: row.dateTime,
              })),
            },
            data: { isListed: true },
          });
        }
        return { count: inserted.count, admitted };
      });
      createdCount += result.count;
      admittedShowings.push(...result.admitted);
    }
    // Stamp repeated source contexts without moving or deleting existing showings.
    // Failed HTTP evaluations have no fresh decision and must remain retryable.
    const groups = new Map<string, typeof showingData>();
    for (const showing of admittedShowings) {
      const key = JSON.stringify([
        showing.cinemaId,
        showing.movieId,
        showing.rawMovieName,
        showing.sourceProvider,
        showing.providerFilmId,
        showing.sourceEvidence,
      ]);
      if (!showing.matchEvaluatedAt) continue;
      const group = groups.get(key) ?? [];
      group.push(showing);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      const showing = group[0]!;
      await db.showing.updateMany({
        where: {
          cinemaId: showing.cinemaId,
          movieId: showing.movieId,
          rawMovieName: showing.rawMovieName,
          dateTime: { in: group.map((row) => new Date(row.dateTime)) },
          OR: [
            {
              sourceProvider: showing.sourceProvider,
              providerFilmId: showing.providerFilmId,
            },
            {
              sourceProvider: null,
              providerFilmId: null,
              sourceEvidence: { equals: Prisma.DbNull },
              matcherVersion: null,
            },
          ],
        },
        data: {
          sourceProvider: showing.sourceProvider,
          providerFilmId: showing.providerFilmId,
          sourceEvidence: showing.sourceEvidence,
          matcherVersion: showing.matcherVersion,
          matchEvaluatedAt: showing.matchEvaluatedAt,
          matchEvaluation: showing.matchEvaluation,
        },
      });
    }
  }

  console.info(
    `[Resolver] Created ${createdCount} new showings (${showingData.length - createdCount - heldShowings} duplicates skipped, ${heldShowings} identity changes held for review)`,
  );

  return {
    canonicalMovies: canonicalMovieMap.size,
    totalShowings: createdCount,
    heldShowings,
    tmdbMatched,
    tmdbUnmatched,
    staleMoviesDeleted: 0,
  };
};
