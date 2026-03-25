export type TmdbScoredMatch = {
    tmdbMovieId: number;
    title: string;
    originalTitle: string;
    posterPath: string | null;
    releaseDate: string | null;
    popularity: number;
    confidence: number;
    sourceQuery: string;
};
