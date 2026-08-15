const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_POSTER_SIZE = "w780";

export const getTmdbPosterUrl = (
  posterPath: string | null | undefined,
  baseUrl = TMDB_IMAGE_BASE_URL,
  posterSize = TMDB_POSTER_SIZE,
): string | null => {
  if (!posterPath) return null;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPosterPath = posterPath.replace(/^\/+/, "");
  return `${normalizedBaseUrl}/${posterSize}/${normalizedPosterPath}`;
};
