import { createHash } from "node:crypto";

import { Client as MinioClient } from "minio";

import { env } from "@waslaeuftin/env";
import { db } from "@waslaeuftin/server/db";

type MovieIdentity = {
  cinemaId: number;
  name: string;
};

type TmdbMovieSearchResponse = {
  results: TmdbMovieSearchResult[];
};

type TmdbMovieSearchResult = {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string | null;
  popularity: number;
};

type TmdbScoredMatch = {
  tmdbMovieId: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  releaseDate: string | null;
  popularity: number;
  confidence: number;
  sourceQuery: string;
};

export type TmdbMatchEvaluation = {
  requestedTitle: string;
  normalizedTitle: string;
  threshold: number;
  bestCandidate: TmdbScoredMatch | null;
  acceptedCandidate: TmdbScoredMatch | null;
};

type UploadedCover = {
  objectKey: string;
  publicUrl: string;
};

type SyncMovieCoversResult = {
  consideredMovies: number;
  updatedMovies: number;
  skippedExistingCover: number;
  skippedNoPoster: number;
  skippedNoTmdbMatch: number;
  skippedLowConfidence: number;
};

const MOVIE_KEY_SEPARATOR = "::";

const sanitizeWhitespace = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

const normalizeForComparison = (value: string) => {
  return sanitizeWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " und ")
      .replace(/[^a-z0-9\s]/g, " "),
  );
};

const shouldDropBracketSection = (section: string) => {
  const normalized = normalizeForComparison(section);

  if (normalized.length === 0) {
    return true;
  }

  const metadataMarkers = [
    "ov",
    "omu",
    "omeu",
    "2d",
    "3d",
    "imax",
    "dolby",
    "atmos",
    "preview",
    "sneak",
    "fsk",
    "dt fassung",
    "deutsche fassung",
    "original version",
    "originalfassung",
    "untertitel",
    "english",
    "70mm",
    "35mm",
    "4k",
    "hfr",
    "screenx",
    "4dx",
    "laser",
  ];

  return metadataMarkers.some((marker) => normalized.includes(marker));
};

const normalizeMovieTitleForSearch = (title: string) => {
  const withoutMetadataBrackets = title.replace(/\(([^)]*)\)/g, (full, section) => {
    if (shouldDropBracketSection(section)) {
      return " ";
    }

    return full;
  });

  const withoutCommonTags = withoutMetadataBrackets.replace(
    /\b(ov|omu|omeu|2d|3d|imax|dolby\s*atmos|dolby|preview|sneak|english|dt\.?\s*fassung|deutsche\s*fassung|original\s*version|70mm|35mm|4k|hfr|screenx|4dx|laser)\b/gi,
    " ",
  );

  const normalized = sanitizeWhitespace(
    withoutCommonTags
      .replace(/[–—]/g, "-")
      .replace(/[|]/g, " ")
      .replace(/\s+-\s+/g, " - "),
  );

  return normalized;
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

const buildMovieIdentityKey = (movie: MovieIdentity) => {
  return `${movie.cinemaId}${MOVIE_KEY_SEPARATOR}${movie.name}`;
};

const buildTmdbSearchQueries = (originalTitle: string, normalizedTitle: string) => {
  const queries = [normalizedTitle, originalTitle, normalizeMovieTitleForSearch(originalTitle)];

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
        .filter((query) => query.length >= 2),
    ),
  ).slice(0, 3);
};

const getTmdbPosterUrl = (posterPath: string) => {
  const normalizedBaseUrl = env.TMDB_IMAGE_BASE_URL.replace(/\/+$/, "");
  const normalizedPosterPath = posterPath.replace(/^\/+/, "");

  return `${normalizedBaseUrl}/${env.TMDB_POSTER_SIZE}/${normalizedPosterPath}`;
};

const getUrlPathJoin = (...parts: string[]) => {
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, "");
      }

      return part.replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean)
    .join("/");
};

const encodeObjectKeyForPublicUrl = (key: string) => {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

const slugifyForObjectKey = (value: string) => {
  const normalized = normalizeForComparison(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return normalized.length > 0 ? normalized : "movie";
};

const scoreTmdbCandidate = (
  requestedNormalizedTitle: string,
  result: TmdbMovieSearchResult,
) => {
  const candidateTitle = normalizeForComparison(result.title);
  const candidateOriginalTitle = normalizeForComparison(result.original_title);

  const titleDice = getDiceSimilarity(requestedNormalizedTitle, candidateTitle);
  const originalTitleDice = getDiceSimilarity(
    requestedNormalizedTitle,
    candidateOriginalTitle,
  );
  const bestDice = Math.max(titleDice, originalTitleDice);

  const titleOverlap = getTokenOverlapScore(requestedNormalizedTitle, candidateTitle);
  const originalTitleOverlap = getTokenOverlapScore(
    requestedNormalizedTitle,
    candidateOriginalTitle,
  );
  const bestTokenOverlap = Math.max(titleOverlap, originalTitleOverlap);

  const candidateForInclusion =
    titleDice >= originalTitleDice ? candidateTitle : candidateOriginalTitle;

  const inclusionBoost =
    candidateForInclusion.includes(requestedNormalizedTitle) ||
    requestedNormalizedTitle.includes(candidateForInclusion)
      ? 0.08
      : 0;

  const exactMatchBoost = requestedNormalizedTitle === candidateForInclusion ? 0.18 : 0;

  const requestedYear = extractYear(requestedNormalizedTitle);
  const releaseYear = extractYear(result.release_date ?? "");
  const releaseYearBoost =
    requestedYear && releaseYear && requestedYear === releaseYear ? 0.06 : 0;

  const popularityBoost = Math.min(result.popularity / 150, 1) * 0.06;
  const posterPenalty = result.poster_path ? 0 : -0.2;

  const score =
    0.58 * bestDice +
    0.28 * bestTokenOverlap +
    inclusionBoost +
    exactMatchBoost +
    releaseYearBoost +
    popularityBoost +
    posterPenalty;

  return clampScore(score);
};

class TmdbMovieMatcher {
  private readonly searchCache = new Map<string, TmdbMatchEvaluation>();

  async evaluate(title: string): Promise<TmdbMatchEvaluation> {
    const normalizedTitle = normalizeForComparison(normalizeMovieTitleForSearch(title));
    const cacheKey = normalizedTitle || normalizeForComparison(title);

    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      console.info(`[TMDB Cover Sync]   → Cache hit for normalized title: "${cacheKey}"`);
      return {
        ...cached,
        requestedTitle: title,
      };
    }

    const queries = buildTmdbSearchQueries(title, normalizeMovieTitleForSearch(title));
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

    const bestCandidate = Array.from(byTmdbId.values()).sort(
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

const createMinioClient = () => {
  const endpointUrl = new URL(env.MINIO_ENDPOINT);

  return new MinioClient({
    endPoint: endpointUrl.hostname,
    port: endpointUrl.port ? Number(endpointUrl.port) : undefined,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    region: env.MINIO_REGION,
  });
};

const normalizePrefix = (value: string) => {
  return value.replace(/^\/+|\/+$/g, "");
};

const ensureMinioFolder = async (client: MinioClient, prefix: string) => {
  const bucketExists = await client.bucketExists(env.MINIO_BUCKET);

  if (!bucketExists) {
    throw new Error(
      `MinIO bucket "${env.MINIO_BUCKET}" does not exist. Please create it first.`,
    );
  }

  const keepFileKey = `${prefix}/.keep`;

  try {
    await client.statObject(env.MINIO_BUCKET, keepFileKey);
  } catch {
    await client.putObject(
      env.MINIO_BUCKET,
      keepFileKey,
      Buffer.from("waslaeuftin movie covers\n"),
      undefined,
      {
        "Content-Type": "text/plain; charset=utf-8",
      },
    );
  }
};

const buildStorageKey = (prefix: string, movieName: string, match: TmdbScoredMatch) => {
  const extension = (match.posterPath?.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "");
  const posterHash = createHash("sha1")
    .update(match.posterPath ?? `${match.tmdbMovieId}`)
    .digest("hex")
    .slice(0, 12);
  const titleSlug = slugifyForObjectKey(movieName);

  return `${prefix}/${titleSlug}-${match.tmdbMovieId}-${posterHash}.${extension || "jpg"}`;
};

const uploadTmdbPosterToMinio = async (
  client: MinioClient,
  movieName: string,
  match: TmdbScoredMatch,
  prefix: string,
  uploadedPosterCache: Map<string, UploadedCover>,
) => {
  if (!match.posterPath) {
    throw new Error("Cannot upload poster without TMDB poster path");
  }

  const cachedUpload = uploadedPosterCache.get(match.posterPath);
  if (cachedUpload) {
    return cachedUpload;
  }

  const posterUrl = getTmdbPosterUrl(match.posterPath);
  const posterResponse = await fetch(posterUrl);

  if (!posterResponse.ok) {
    throw new Error(
      `TMDB poster download failed (${posterResponse.status}) for ${posterUrl}`,
    );
  }

  const posterArrayBuffer = await posterResponse.arrayBuffer();
  const posterBuffer = Buffer.from(posterArrayBuffer);

  if (posterBuffer.length === 0) {
    throw new Error(`TMDB poster download returned empty payload for ${posterUrl}`);
  }

  const objectKey = buildStorageKey(prefix, movieName, match);

  await client.putObject(env.MINIO_BUCKET, objectKey, posterBuffer, posterBuffer.length, {
    "Content-Type": posterResponse.headers.get("content-type") ?? "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const publicUrl = getUrlPathJoin(
    env.MINIO_PUBLIC_BASE_URL,
    encodeObjectKeyForPublicUrl(objectKey),
  );

  const uploaded = {
    objectKey,
    publicUrl,
  } satisfies UploadedCover;

  uploadedPosterCache.set(match.posterPath, uploaded);

  return uploaded;
};

export const getMovieIdentitySnapshot = async () => {
  const movies = await db.movie.findMany({
    select: {
      cinemaId: true,
      name: true,
    },
  });

  return new Set(movies.map((movie) => buildMovieIdentityKey(movie)));
};

export const syncTmdbMovieCoversForNewMovies = async (
  existingMovieKeys: Set<string>,
): Promise<SyncMovieCoversResult> => {
  const matcher = new TmdbMovieMatcher();
  const minioClient = createMinioClient();
  const normalizedPrefix = normalizePrefix(env.MINIO_MOVIE_COVERS_PREFIX);
  const uploadedPosterCache = new Map<string, UploadedCover>();

  await ensureMinioFolder(minioClient, normalizedPrefix);

  const currentMovies = await db.movie.findMany({
    select: {
      cinemaId: true,
      name: true,
      coverUrl: true,
    },
  });

  const newlyCreatedMovies = currentMovies.filter((movie) => {
    return !existingMovieKeys.has(buildMovieIdentityKey(movie));
  });

  const result: SyncMovieCoversResult = {
    consideredMovies: newlyCreatedMovies.length,
    updatedMovies: 0,
    skippedExistingCover: 0,
    skippedNoPoster: 0,
    skippedNoTmdbMatch: 0,
    skippedLowConfidence: 0,
  };

  console.info(
    `[TMDB Cover Sync] Found ${newlyCreatedMovies.length} newly created movies to evaluate`,
  );

  for (const [index, movie] of newlyCreatedMovies.entries()) {
    console.info(
      `[TMDB Cover Sync] [${index + 1}/${newlyCreatedMovies.length}] Processing: ${movie.name}`,
    );

    if (movie.coverUrl) {
      result.skippedExistingCover += 1;
      console.info(`[TMDB Cover Sync]   → Skipped (existing cover)`);
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

    const uploadedCover = await uploadTmdbPosterToMinio(
      minioClient,
      movie.name,
      evaluation.acceptedCandidate,
      normalizedPrefix,
      uploadedPosterCache,
    );

    await db.movie.update({
      where: {
        cinemaId_name: {
          cinemaId: movie.cinemaId,
          name: movie.name,
        },
      },
      data: {
        coverUrl: uploadedCover.publicUrl,
        coverStorageKey: uploadedCover.objectKey,
        coverConfidence: evaluation.acceptedCandidate.confidence,
        tmdbMovieId: evaluation.acceptedCandidate.tmdbMovieId,
      },
    });

    result.updatedMovies += 1;
    console.info(
      `[TMDB Cover Sync]   → Updated with confidence=${evaluation.acceptedCandidate.confidence.toFixed(3)}`,
    );
  }

  return result;
};

export const syncTmdbMovieCoversForAllMovies = async (options?: {
  forceRefreshExistingCovers?: boolean;
}): Promise<SyncMovieCoversResult> => {
  const matcher = new TmdbMovieMatcher();
  const minioClient = createMinioClient();
  const normalizedPrefix = normalizePrefix(env.MINIO_MOVIE_COVERS_PREFIX);
  const uploadedPosterCache = new Map<string, UploadedCover>();

  await ensureMinioFolder(minioClient, normalizedPrefix);

  const allMovies = await db.movie.findMany({
    select: {
      cinemaId: true,
      name: true,
      coverUrl: true,
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

  const forceRefreshExistingCovers = options?.forceRefreshExistingCovers ?? false;

  console.info(
    `[TMDB Cover Sync] Found ${allMovies.length} movies to evaluate (forceRefreshExistingCovers=${forceRefreshExistingCovers})`,
  );

  for (const [index, movie] of allMovies.entries()) {
    console.info(
      `[TMDB Cover Sync] [${index + 1}/${allMovies.length}] Processing: ${movie.name}`,
    );

    if (!forceRefreshExistingCovers && movie.coverUrl) {
      result.skippedExistingCover += 1;
      console.info(`[TMDB Cover Sync]   → Skipped (existing cover)`);
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

    const uploadedCover = await uploadTmdbPosterToMinio(
      minioClient,
      movie.name,
      evaluation.acceptedCandidate,
      normalizedPrefix,
      uploadedPosterCache,
    );

    await db.movie.update({
      where: {
        cinemaId_name: {
          cinemaId: movie.cinemaId,
          name: movie.name,
        },
      },
      data: {
        coverUrl: uploadedCover.publicUrl,
        coverStorageKey: uploadedCover.objectKey,
        coverConfidence: evaluation.acceptedCandidate.confidence,
        tmdbMovieId: evaluation.acceptedCandidate.tmdbMovieId,
      },
    });

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
