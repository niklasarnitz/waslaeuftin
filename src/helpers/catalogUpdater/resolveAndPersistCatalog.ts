import { env } from "@waslaeuftin/env";
import { db } from "@waslaeuftin/server/db";
import { Client as MinioClient } from "minio";
import { ensureMinioFolder } from "../fileStorage/ensureMinioFolder";
import { normalizeMovieTitle } from "../titleNormalization/normalizeMovieTitle";
import { normalizePrefix } from "../titleNormalization/normalizePrefix";
import { ProviderCatalog } from "../../types/ProviderCatalog";
import { ResolvedMovie } from "../../types/ResolvedMovie";
import { TmdbMovieMatcher } from "../tmdb/TmdbMovieMatcher";
import { UploadedCover } from "../../types/UploadedCover";
import { uploadTmdbPosterToMinio } from "../fileStorage/uploadTmdbPosterToMinio";
import { upsertTmdbMetadata } from "../fileStorage/upsertTmdbMetadata";
import { normalizeMovieTitleForSearch } from "../titleNormalization/normalizeMovieTitleForSearch";
import { normalizeForComparison } from "../titleNormalization/normalizeForComparison";
import { fetchTmdbMovieDetails } from "../tmdb/fetchTmdbMovieDetails";


export const resolveAndPersistCatalog = async (
    catalogs: ProviderCatalog[]
) => {
    const allShowings = catalogs.flatMap((c) => c.showings);
    const allMovies = catalogs.flatMap((c) => c.movies);

    // Collect unique raw titles
    const rawTitles = [
        ...new Set([
            ...allMovies.map((m) => m.name),
            ...allShowings.map((s) => s.movieName),
        ]),
    ];

    console.info(
        `[Resolver] Resolving ${rawTitles.length} unique raw titles from ${allShowings.length} showings`
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
        },
    });

    // Build lookup maps for database movies
    const dbMovieByTmdbId = new Map(
        dbMovies.filter((m) => m.tmdbMovieId).map((m) => [m.tmdbMovieId!, m])
    );
    const dbMoviesByNormalizedTitle = new Map<string, typeof dbMovies>();
    for (const movie of dbMovies) {
        const key = normalizeForComparison(movie.normalizedTitle);
        if (!dbMoviesByNormalizedTitle.has(key)) {
            dbMoviesByNormalizedTitle.set(key, []);
        }
        dbMoviesByNormalizedTitle.get(key)!.push(movie);
    }

    console.info(`[Resolver] Loaded ${dbMovies.length} existing movies from database`);

    // ─── Phase 2: Match raw titles to existing database movies or mark as new ──
    const matcher = new TmdbMovieMatcher();
    const minioClient = new MinioClient({
        endPoint: new URL(env.MINIO_ENDPOINT).hostname,
        port: new URL(env.MINIO_ENDPOINT).port
            ? Number(new URL(env.MINIO_ENDPOINT).port)
            : undefined,
        useSSL: env.MINIO_USE_SSL,
        accessKey: env.MINIO_ACCESS_KEY,
        secretKey: env.MINIO_SECRET_KEY,
        region: env.MINIO_REGION,
    });
    const normalizedPrefix = normalizePrefix(env.MINIO_MOVIE_COVERS_PREFIX);
    const uploadedPosterCache = new Map<string, UploadedCover>();

    await ensureMinioFolder(minioClient, normalizedPrefix);

    // Map: raw title -> ResolvedMovie
    const titleResolutionMap = new Map<string, ResolvedMovie>();
    // Map: canonicalKey -> ResolvedMovie (deduplicated)
    const canonicalMovieMap = new Map<string, ResolvedMovie>();

    // Track which movies need TMDB data
    const moviesToFetchTmdbData = new Set<string>(); // raw titles

    let tmdbMatched = 0;
    let tmdbUnmatched = 0;

    console.info(`[Resolver] Phase 2: Matching raw titles to database movies...`);

    for (const [index, rawTitle] of rawTitles.entries()) {
        const normalizedTitle = normalizeMovieTitleForSearch(rawTitle);
        const comparisonKey = normalizeForComparison(normalizedTitle);

        // Check if we already resolved a title with the same comparison key
        const existingByComparison = Array.from(titleResolutionMap.values()).find(
            (r) => normalizeForComparison(r.normalizedTitle) === comparisonKey &&
                comparisonKey.length > 0
        );

        if (existingByComparison) {
            titleResolutionMap.set(rawTitle, existingByComparison);
            continue;
        }

        console.info(
            `[Resolver] [${index + 1}/${rawTitles.length}] Matching: "${rawTitle}"`
        );

        // Try to find in database by normalized title
        const dbCandidates = dbMoviesByNormalizedTitle.get(comparisonKey) ?? [];
        let dbMatch = dbCandidates.length > 0 ? dbCandidates[0] : null;

        if (dbMatch) {
            // Found in database
            const resolved: ResolvedMovie = {
                canonicalKey: dbMatch.canonicalKey,
                name: dbMatch.name,
                normalizedTitle: dbMatch.normalizedTitle,
                tmdbMovieId: dbMatch.tmdbMovieId,
                coverUrl: dbMatch.coverUrl,
                coverStorageKey: dbMatch.coverStorageKey,
                coverConfidence: dbMatch.coverConfidence,
            };

            titleResolutionMap.set(rawTitle, resolved);
            canonicalMovieMap.set(dbMatch.canonicalKey, resolved);

            // Check if we need to fetch TMDB data for this movie
            if (!dbMatch.coverUrl || !dbMatch.tmdbMovieId) {
                moviesToFetchTmdbData.add(rawTitle);
            }

            console.info(
                `[Resolver]   → Found in DB: "${dbMatch.name}" (id=${dbMatch.id})`
            );
            continue;
        }

        // Not found in database, mark as new and fetch TMDB data
        moviesToFetchTmdbData.add(rawTitle);
        console.info(
            `[Resolver]   → Not in DB, will fetch TMDB data`
        );
    }

    // ─── Phase 3: Fetch TMDB data only for new or incomplete movies ──────────
    console.info(
        `[Resolver] Phase 3: Fetching TMDB data for ${moviesToFetchTmdbData.size} movies`
    );

    let newMoviesCreated = 0;

    // Phase 3a: Evaluate TMDB titles in batches (respects rate limiting)
    const rawTitlesArray = Array.from(moviesToFetchTmdbData);
    const TMDB_BATCH_SIZE = 10; // Process 10 titles at a time with the internal rate limiter
    const allEvaluationResults: PromiseSettledResult<{
        rawTitle: string;
        evaluation: Awaited<ReturnType<typeof matcher.evaluate>>;
    }>[] = [];

    console.info(
        `[Resolver] Executing ${rawTitlesArray.length} TMDB evaluations in batches (max 10 per batch)...`
    );

    for (let i = 0; i < rawTitlesArray.length; i += TMDB_BATCH_SIZE) {
        const batchTitles = rawTitlesArray.slice(i, i + TMDB_BATCH_SIZE);
        const batchProgress = `${Math.min(i + TMDB_BATCH_SIZE, rawTitlesArray.length)}/${rawTitlesArray.length}`;

        console.info(`[Resolver] Batch progress: ${batchProgress}`);

        const batchPromises = batchTitles.map((rawTitle) => matcher.evaluate(rawTitle).then((evaluation) => ({
            rawTitle,
            evaluation,
        }))
        );

        const batchResults = await Promise.allSettled(batchPromises);
        allEvaluationResults.push(...batchResults);
    }

    // Phase 3b: Process evaluation results sequentially (for poster uploads, etc.)
    for (const [index, evaluationResult] of allEvaluationResults.entries()) {
        const rawTitle = rawTitlesArray[index]!;
        const existingResolution = titleResolutionMap.get(rawTitle);

        if (!existingResolution) {
            console.warn(`[Resolver] No resolution found for "${rawTitle}"`);
            continue;
        }

        if (evaluationResult.status === "rejected") {
            console.warn(
                `[Resolver] [${index + 1}/${allEvaluationResults.length}] TMDB evaluation failed for "${rawTitle}":`,
                evaluationResult.reason
            );
            tmdbUnmatched++;
            continue;
        }

        const { evaluation } = evaluationResult.value;
        const normalizedTitle = normalizeMovieTitleForSearch(rawTitle);

        console.info(
            `[Resolver] [${index + 1}/${allEvaluationResults.length}] Processing TMDB result for: "${rawTitle}"`
        );

        if (evaluation.acceptedCandidate) {
            const match = evaluation.acceptedCandidate;

            // ─── Phase 3c: Re-check against database with TMDB ID ─────────────────
            let dbMatchByTmbd = dbMovieByTmdbId.get(match.tmdbMovieId);

            if (dbMatchByTmbd) {
                // TMDB ID already exists in database
                const resolved: ResolvedMovie = {
                    canonicalKey: dbMatchByTmbd.canonicalKey,
                    name: dbMatchByTmbd.name,
                    normalizedTitle: dbMatchByTmbd.normalizedTitle,
                    tmdbMovieId: dbMatchByTmbd.tmdbMovieId,
                    coverUrl: dbMatchByTmbd.coverUrl,
                    coverStorageKey: dbMatchByTmbd.coverStorageKey,
                    coverConfidence: dbMatchByTmbd.coverConfidence,
                };

                titleResolutionMap.set(rawTitle, resolved);
                canonicalMovieMap.set(dbMatchByTmbd.canonicalKey, resolved);

                console.info(
                    `[Resolver]   → TMDB ID found in DB (better match): "${dbMatchByTmbd.name}"`
                );
                tmdbMatched++;
                continue;
            }

            // New movie with TMDB match - fetch and upload
            const canonicalKey = `tmdb:${match.tmdbMovieId}`;

            // Check if we already processed this TMDB ID in this run
            const existing = canonicalMovieMap.get(canonicalKey);
            if (existing) {
                titleResolutionMap.set(rawTitle, existing);
                tmdbMatched++;
                console.info(
                    `[Resolver]   → TMDB hit (cached): ${match.title} (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`
                );
                continue;
            }

            // Fetch details & upload cover
            let coverUrl: string | null = null;
            let coverStorageKey: string | null = null;

            try {
                const details = await fetchTmdbMovieDetails(match.tmdbMovieId);
                await upsertTmdbMetadata(details);
            } catch (error) {
                console.warn(
                    `[Resolver]   → Warning: Could not fetch/store TMDB metadata for ${match.tmdbMovieId}:`,
                    error
                );
            }

            if (match.posterPath) {
                try {
                    const uploaded = await uploadTmdbPosterToMinio(
                        minioClient,
                        match.title,
                        match,
                        normalizedPrefix,
                        uploadedPosterCache
                    );
                    coverUrl = uploaded.publicUrl;
                    coverStorageKey = uploaded.objectKey;
                } catch (error) {
                    console.warn(
                        `[Resolver]   → Warning: Could not upload poster for ${match.tmdbMovieId}:`,
                        error
                    );
                }
            }

            const resolved: ResolvedMovie = {
                canonicalKey,
                name: match.title,
                normalizedTitle,
                tmdbMovieId: match.tmdbMovieId,
                coverUrl,
                coverStorageKey,
                coverConfidence: match.confidence,
            };

            titleResolutionMap.set(rawTitle, resolved);
            canonicalMovieMap.set(canonicalKey, resolved);

            tmdbMatched++;
            newMoviesCreated++;
            console.info(
                `[Resolver]   → TMDB matched (new): "${match.title}" (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`
            );
        } else {
            // No TMDB match found
            const existingResolution = titleResolutionMap.get(rawTitle);

            if (existingResolution && existingResolution.tmdbMovieId === null) {
                // Already resolved with fallback
                console.info(
                    `[Resolver]   → No TMDB match, using fallback: "${existingResolution.name}"`
                );
            } else {
                // Create fallback resolution
                const normalizedForFallback = normalizeMovieTitleForSearch(rawTitle);
                const comparisonKey = normalizeForComparison(normalizedForFallback);
                const canonicalKey = `title:${comparisonKey}`;

                const existing = canonicalMovieMap.get(canonicalKey);
                if (existing) {
                    titleResolutionMap.set(rawTitle, existing);
                } else {
                    const resolved: ResolvedMovie = {
                        canonicalKey,
                        name: normalizedForFallback || rawTitle,
                        normalizedTitle: normalizedForFallback || rawTitle,
                        tmdbMovieId: null,
                        coverUrl: null,
                        coverStorageKey: null,
                        coverConfidence: null,
                    };

                    titleResolutionMap.set(rawTitle, resolved);
                    canonicalMovieMap.set(canonicalKey, resolved);
                }

                console.info(
                    `[Resolver]   → No TMDB match, using fallback: "${titleResolutionMap.get(rawTitle)?.name}"`
                );
            }

            tmdbUnmatched++;
        }
    }

    console.info(
        `[Resolver] TMDB resolution complete: ${newMoviesCreated} new movies, ${tmdbMatched} TMDB matched, ${tmdbUnmatched} fallback)`
    );

    // ─── Phase 4: Persist to database ────────────────────────────────────────
    console.info(`[Resolver] Phase 4: Writing to database...`);

    // Upsert all canonical movies
    const movieIdByCanonicalKey = new Map<string, number>();

    for (const canonicalMovie of canonicalMovieMap.values()) {
        const movie = await db.movie.upsert({
            where: { canonicalKey: canonicalMovie.canonicalKey },
            update: {
                name: canonicalMovie.name,
                normalizedTitle: canonicalMovie.normalizedTitle,
                coverUrl: canonicalMovie.coverUrl,
                coverStorageKey: canonicalMovie.coverStorageKey,
                coverConfidence: canonicalMovie.coverConfidence,
                tmdbMovieId: canonicalMovie.tmdbMovieId,
            },
            create: {
                canonicalKey: canonicalMovie.canonicalKey,
                name: canonicalMovie.name,
                normalizedTitle: canonicalMovie.normalizedTitle,
                coverUrl: canonicalMovie.coverUrl,
                coverStorageKey: canonicalMovie.coverStorageKey,
                coverConfidence: canonicalMovie.coverConfidence,
                tmdbMovieId: canonicalMovie.tmdbMovieId,
            },
            select: { id: true, canonicalKey: true },
        });

        movieIdByCanonicalKey.set(movie.canonicalKey, movie.id);
    }

    console.info(
        `[Resolver] Upserted ${movieIdByCanonicalKey.size} canonical movies`
    );

    // Create all showings
    const showingData = allShowings
        .map((showing) => {
            const resolved = titleResolutionMap.get(showing.movieName);
            if (!resolved) {
                console.warn(
                    `[Resolver] No resolution for showing movie name: "${showing.movieName}"`
                );
                return null;
            }

            const movieId = movieIdByCanonicalKey.get(resolved.canonicalKey);
            if (!movieId) {
                console.warn(
                    `[Resolver] No movie ID for canonical key: "${resolved.canonicalKey}"`
                );
                return null;
            }

            // Automatically combine existing additional data with any tags parsed from the movie title
            const extractedTags = normalizeMovieTitle(showing.movieName).tags;
            const combinedAdditionalData = Array.from(new Set([
                ...(showing.showingAdditionalData ?? []),
                ...extractedTags
            ]));

            return {
                cinemaId: showing.cinemaId,
                movieId,
                rawMovieName: showing.movieName,
                dateTime: showing.dateTime,
                bookingUrl: showing.bookingUrl ?? null,
                showingAdditionalData: combinedAdditionalData,
            };
        })
        .filter(
            (s): s is NonNullable<typeof s> => s !== null
        );

    // createMany in batches of 1000, skipping duplicates
    const BATCH_SIZE = 1000;
    let createdCount = 0;
    for (let i = 0; i < showingData.length; i += BATCH_SIZE) {
        const result = await db.showing.createMany({
            data: showingData.slice(i, i + BATCH_SIZE),
            skipDuplicates: true,
        });
        createdCount += result.count;
    }

    console.info(`[Resolver] Created ${createdCount} new showings (${showingData.length - createdCount} duplicates skipped)`);

    return {
        canonicalMovies: canonicalMovieMap.size,
        totalShowings: createdCount,
        tmdbMatched,
        tmdbUnmatched,
        staleMoviesDeleted: 0,
    };
};
