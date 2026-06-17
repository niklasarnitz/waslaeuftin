const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_POSTER_SIZE = "w780";

/** Builds a full TMDB poster URL from a raw poster path (e.g. "/abc.jpg"). */
export const getTmdbPosterUrl = (posterPath: string | null): string | null => {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZE}/${posterPath.replace(/^\/+/, "")}`;
};
