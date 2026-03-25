import { db } from "@waslaeuftin/server/db";
import { TmdbMovieDetailsResponse } from "@waslaeuftin/types/TmdbMovieDetailsResponse";

export const upsertTmdbMetadata = async (details: TmdbMovieDetailsResponse) => {
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
