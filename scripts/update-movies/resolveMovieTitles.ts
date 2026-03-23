import { createHash } from "node:crypto";

import { Client as MinioClient } from "minio";

import { env } from "@waslaeuftin/env";
import { db } from "@waslaeuftin/server/db";

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

type TmdbMovieDetailsResponse = {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string | null;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  popularity: number;
  vote_average: number;
  vote_count: number;
  status: string;
  adult: boolean;
  video: boolean;
  homepage: string | null;
  imdb_id: string | null;
  genres: Array<{ id: number; name: string }>;
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

type UploadedCover = {
  objectKey: string;
  publicUrl: string;
};

export type ResolvedMovie = {
  canonicalKey: string;
  name: string;
  normalizedTitle: string;
  tmdbMovieId: number | null;
  coverUrl: string | null;
  coverStorageKey: string | null;
  coverConfidence: number | null;
};

// ─── String normalization ───────────────────────────────────────────────────

const sanitizeWhitespace = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

export const normalizeForComparison = (value: string) => {
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

export const normalizeMovieTitleForSearch = (title: string) => {
  const withoutMetadataBrackets = title.replace(
    /\(([^)]*)\)/g,
    (full, section) => {
      if (shouldDropBracketSection(section)) {
        return " ";
      }

      return full;
    },
  );

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

// ─── Similarity scoring ─────────────────────────────────────────────────────

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

const buildTmdbSearchQueries = (
  originalTitle: string,
  normalizedTitle: string,
) => {
  const queries = [
    normalizedTitle,
    originalTitle,
    normalizeMovieTitleForSearch(originalTitle),
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
        .filter((query) => query.length >= 2),
    ),
  ).slice(0, 3);
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

  const titleOverlap = getTokenOverlapScore(
    requestedNormalizedTitle,
    candidateTitle,
  );
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

  const exactMatchBoost =
    requestedNormalizedTitle === candidateForInclusion ? 0.18 : 0;

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

// ─── TMDB matcher ───────────────────────────────────────────────────────────

class TmdbMovieMatcher {
  private readonly searchCache = new Map<
    string,
    { bestCandidate: TmdbScoredMatch | null; acceptedCandidate: TmdbScoredMatch | null }
  >();

  async evaluate(title: string) {
    const normalizedTitle = normalizeForComparison(
      normalizeMovieTitleForSearch(title),
    );
    const cacheKey = normalizedTitle || normalizeForComparison(title);

    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const queries = buildTmdbSearchQueries(
      title,
      normalizeMovieTitleForSearch(title),
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
        headers: { Accept: "application/json" },
      });

      if (!searchResponse.ok) {
        throw new Error(
          `TMDB search failed (${searchResponse.status}) for query "${query}"`,
        );
      }

      const payload =
        (await searchResponse.json()) as TmdbMovieSearchResponse;
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

    const result = { bestCandidate, acceptedCandidate };
    this.searchCache.set(cacheKey, result);

    return result;
  }
}

// ─── TMDB metadata & cover helpers ──────────────────────────────────────────

const fetchTmdbMovieDetails = async (
  tmdbId: number,
): Promise<TmdbMovieDetailsResponse> => {
  const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  detailsUrl.searchParams.set("api_key", env.TMDB_API_KEY);
  detailsUrl.searchParams.set("language", "de-DE");

  const response = await fetch(detailsUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `TMDB details fetch failed (${response.status}) for movie ${tmdbId}`,
    );
  }

  return (await response.json()) as TmdbMovieDetailsResponse;
};

const upsertTmdbMetadata = async (details: TmdbMovieDetailsResponse) => {
  const genresString = details.genres.map((g) => g.name).join(", ");

  await db.tmdbMetadata.upsert({
    where: { tmdbId: details.id },
    create: {
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      tagline: details.tagline,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      releaseDate: details.release_date,
      runtime: details.runtime,
      budget: details.budget,
      revenue: details.revenue,
      popularity: details.popularity,
      voteAverage: details.vote_average,
      voteCount: details.vote_count,
      status: details.status,
      adult: details.adult,
      video: details.video,
      homepage: details.homepage,
      imdbId: details.imdb_id,
      genres: genresString,
    },
    update: {
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      tagline: details.tagline,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      releaseDate: details.release_date,
      runtime: details.runtime,
      budget: details.budget,
      revenue: details.revenue,
      popularity: details.popularity,
      voteAverage: details.vote_average,
      voteCount: details.vote_count,
      status: details.status,
      adult: details.adult,
      video: details.video,
      homepage: details.homepage,
      imdbId: details.imdb_id,
      genres: genresString,
    },
  });
};

const getTmdbPosterUrl = (posterPath: string) => {
  const normalizedBaseUrl = env.TMDB_IMAGE_BASE_URL.replace(/\/+$/, "");
  const normalizedPosterPath = posterPath.replace(/^\/+/, "");

  return `${normalizedBaseUrl}/${env.TMDB_POSTER_SIZE}/${normalizedPosterPath}`;
};

const slugifyForObjectKey = (value: string) => {
  const normalized = normalizeForComparison(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return normalized.length > 0 ? normalized : "movie";
};

const buildStorageKey = (
  prefix: string,
  movieName: string,
  match: TmdbScoredMatch,
) => {
  const extension = (match.posterPath?.split(".").pop() ?? "jpg").replace(
    /[^a-z0-9]/gi,
    "",
  );
  const posterHash = createHash("sha1")
    .update(match.posterPath ?? `${match.tmdbMovieId}`)
    .digest("hex")
    .slice(0, 12);
  const titleSlug = slugifyForObjectKey(movieName);

  return `${prefix}/${titleSlug}-${match.tmdbMovieId}-${posterHash}.${extension || "jpg"}`;
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
    throw new Error(
      `TMDB poster download returned empty payload for ${posterUrl}`,
    );
  }

  const objectKey = buildStorageKey(prefix, movieName, match);

  await client.putObject(
    env.MINIO_BUCKET,
    objectKey,
    posterBuffer,
    posterBuffer.length,
    {
      "Content-Type":
        posterResponse.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  );

  const publicUrl = getUrlPathJoin(
    env.MINIO_PUBLIC_BASE_URL,
    encodeObjectKeyForPublicUrl(objectKey),
  );

  const uploaded = { objectKey, publicUrl } satisfies UploadedCover;
  uploadedPosterCache.set(match.posterPath, uploaded);

  return uploaded;
};

// ─── Public API ─────────────────────────────────────────────────────────────

export type RawProviderShowing = {
  cinemaId: number;
  movieName: string;
  dateTime: Date;
  bookingUrl?: string | null;
  showingAdditionalData?: string[] | null;
};

export type RawProviderMovie = {
  cinemaId: number;
  name: string;
};

export type ProviderCatalog = {
  movies: RawProviderMovie[];
  showings: RawProviderShowing[];
};

export const resolveAndPersistCatalog = async (
  catalogs: ProviderCatalog[],
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
    `[Resolver] Resolving ${rawTitles.length} unique raw titles from ${allShowings.length} showings`,
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
  const dbMovieByCanonicalKey = new Map(
    dbMovies.map((m) => [m.canonicalKey, m])
  );
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
      (r) =>
        normalizeForComparison(r.normalizedTitle) === comparisonKey &&
        comparisonKey.length > 0,
    );

    if (existingByComparison) {
      titleResolutionMap.set(rawTitle, existingByComparison);
      continue;
    }

    console.info(
      `[Resolver] [${index + 1}/${rawTitles.length}] Matching: "${rawTitle}"`,
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
        `[Resolver]   → Found in DB: "${dbMatch.name}" (id=${dbMatch.id})`,
      );
      continue;
    }

    // Not found in database, mark as new and fetch TMDB data
    moviesToFetchTmdbData.add(rawTitle);
    console.info(
      `[Resolver]   → Not in DB, will fetch TMDB data`,
    );
  }

  // ─── Phase 3: Fetch TMDB data only for new or incomplete movies ──────────

  console.info(
    `[Resolver] Phase 3: Fetching TMDB data for ${moviesToFetchTmdbData.size} movies`,
  );

  let newMoviesCreated = 0;

  // Phase 3a: Evaluate all TMDB titles in parallel
  const rawTitlesArray = Array.from(moviesToFetchTmdbData);
  const evaluationPromises = rawTitlesArray.map((rawTitle) =>
    matcher.evaluate(rawTitle).then((evaluation) => ({
      rawTitle,
      evaluation,
    }))
  );

  console.info(
    `[Resolver] Executing ${evaluationPromises.length} TMDB evaluations in parallel...`,
  );

  const evaluationResults = await Promise.allSettled(evaluationPromises);

  // Phase 3b: Process evaluation results sequentially (for poster uploads, etc.)
  for (const [index, evaluationResult] of evaluationResults.entries()) {
    const rawTitle = rawTitlesArray[index]!;
    const existingResolution = titleResolutionMap.get(rawTitle);

    if (!existingResolution) {
      console.warn(`[Resolver] No resolution found for "${rawTitle}"`);
      continue;
    }

    if (evaluationResult.status === "rejected") {
      console.warn(
        `[Resolver] [${index + 1}/${evaluationResults.length}] TMDB evaluation failed for "${rawTitle}":`,
        evaluationResult.reason,
      );
      tmdbUnmatched++;
      continue;
    }

    const { evaluation } = evaluationResult.value;
    const normalizedTitle = normalizeMovieTitleForSearch(rawTitle);

    console.info(
      `[Resolver] [${index + 1}/${evaluationResults.length}] Processing TMDB result for: "${rawTitle}"`,
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
        titleResolutionMap.set(rawTitle, existing);
        tmdbMatched++;
        console.info(
          `[Resolver]   → TMDB hit (cached): ${match.title} (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`,
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
          error,
        );
      }

      if (match.posterPath) {
        try {
          const uploaded = await uploadTmdbPosterToMinio(
            minioClient,
            match.title,
            match,
            normalizedPrefix,
            uploadedPosterCache,
          );
          coverUrl = uploaded.publicUrl;
          coverStorageKey = uploaded.objectKey;
        } catch (error) {
          console.warn(
            `[Resolver]   → Warning: Could not upload poster for ${match.tmdbMovieId}:`,
            error,
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
        `[Resolver]   → TMDB matched (new): "${match.title}" (${match.tmdbMovieId}) conf=${match.confidence.toFixed(3)}`,
      );
    } else {
      // No TMDB match found
      const existingResolution = titleResolutionMap.get(rawTitle);

      if (existingResolution && existingResolution.tmdbMovieId === null) {
        // Already resolved with fallback
        console.info(
          `[Resolver]   → No TMDB match, using fallback: "${existingResolution.name}"`,
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
          `[Resolver]   → No TMDB match, using fallback: "${titleResolutionMap.get(rawTitle)?.name}"`,
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
    `[Resolver] Upserted ${movieIdByCanonicalKey.size} canonical movies`,
  );

  // Create all showings
  const showingData = allShowings
    .map((showing) => {
      const resolved = titleResolutionMap.get(showing.movieName);
      if (!resolved) {
        console.warn(
          `[Resolver] No resolution for showing movie name: "${showing.movieName}"`,
        );
        return null;
      }

      const movieId = movieIdByCanonicalKey.get(resolved.canonicalKey);
      if (!movieId) {
        console.warn(
          `[Resolver] No movie ID for canonical key: "${resolved.canonicalKey}"`,
        );
        return null;
      }

      return {
        cinemaId: showing.cinemaId,
        movieId,
        rawMovieName: showing.movieName,
        dateTime: showing.dateTime,
        bookingUrl: showing.bookingUrl ?? null,
        showingAdditionalData: showing.showingAdditionalData ?? [],
      };
    })
    .filter(
      (s): s is NonNullable<typeof s> => s !== null,
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
