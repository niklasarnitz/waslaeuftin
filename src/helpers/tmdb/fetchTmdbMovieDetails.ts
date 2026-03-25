import { env } from "@waslaeuftin/env";
import { TmdbMovieDetailsResponse } from "@waslaeuftin/types/TmdbMovieDetailsResponse";

// ─── TMDB metadata & cover helpers ──────────────────────────────────────────
export const fetchTmdbMovieDetails = async (
    tmdbId: number
): Promise<TmdbMovieDetailsResponse> => {
    const detailsUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
    detailsUrl.searchParams.set("api_key", env.TMDB_API_KEY);
    detailsUrl.searchParams.set("language", "de-DE");

    const response = await fetch(detailsUrl, {
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(
            `TMDB details fetch failed (${response.status}) for movie ${tmdbId}`
        );
    }

    return (await response.json()) as TmdbMovieDetailsResponse;
};
