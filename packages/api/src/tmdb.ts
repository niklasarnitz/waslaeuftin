// Server-side TMDB "upcoming movies" proxy. Lives in the API package so the
// `TMDB_API_KEY` never reaches the client. Runs inside the Next.js server
// process where `process.env.TMDB_API_KEY` is available.

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const DEFAULT_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const PAGES_TO_FETCH = 2;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export interface UpcomingMovie {
  tmdbMovieId: number;
  title: string;
  posterPath: string | null;
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string | null;
  popularity: number | null;
}

interface TmdbUpcomingResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  popularity: number | null;
}

interface TmdbUpcomingResponse {
  page: number;
  total_pages: number;
  results: TmdbUpcomingResult[];
}

const getPosterUrl = (posterPath: string | null): string | null => {
  if (!posterPath) return null;
  const baseUrl = (
    process.env.TMDB_IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL
  ).replace(/\/+$/, "");
  const size = process.env.TMDB_POSTER_SIZE ?? "w780";
  return `${baseUrl}/${size}/${posterPath.replace(/^\/+/, "")}`;
};

const fetchUpcomingPage = async (
  region: string,
  page: number,
): Promise<TmdbUpcomingResponse> => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TMDB_API_KEY");
  }

  const url = new URL(`${TMDB_API_BASE}/movie/upcoming`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "de-DE");
  url.searchParams.set("region", region);
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`TMDB upcoming fetch failed (${response.status})`);
  }

  return (await response.json()) as TmdbUpcomingResponse;
};

const cache = new Map<string, { data: UpcomingMovie[]; expiresAt: number }>();

export const fetchUpcomingMovies = async (
  region: string,
): Promise<UpcomingMovie[]> => {
  const cached = cache.get(region);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pages = await Promise.all(
    Array.from({ length: PAGES_TO_FETCH }, (_, index) =>
      fetchUpcomingPage(region, index + 1),
    ),
  );

  const seen = new Set<number>();
  const movies: UpcomingMovie[] = [];

  for (const page of pages) {
    for (const result of page.results) {
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      movies.push({
        tmdbMovieId: result.id,
        title: result.title,
        posterPath: result.poster_path,
        posterUrl: getPosterUrl(result.poster_path),
        releaseDate: result.release_date ?? null,
        overview: result.overview ?? null,
        popularity: result.popularity ?? null,
      });
    }
  }

  // Surface the most anticipated titles first.
  movies.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  cache.set(region, { data: movies, expiresAt: Date.now() + CACHE_TTL_MS });
  return movies;
};
