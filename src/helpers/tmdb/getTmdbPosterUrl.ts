import { env } from "@waslaeuftin/env";

export const getTmdbPosterUrl = (posterPath: string) => {
    const normalizedBaseUrl = env.TMDB_IMAGE_BASE_URL.replace(/\/+$/, "");
    const normalizedPosterPath = posterPath.replace(/^\/+/, "");

    return `${normalizedBaseUrl}/${env.TMDB_POSTER_SIZE}/${normalizedPosterPath}`;
};
