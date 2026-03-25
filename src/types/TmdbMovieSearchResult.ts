export type TmdbMovieSearchResult = {
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
