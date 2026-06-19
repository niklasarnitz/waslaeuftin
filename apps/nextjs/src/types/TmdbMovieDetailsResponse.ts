export type TmdbMovieDetailsResponse = {
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
  videos?: {
    results: Array<{
      key: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
      }>;
    }>;
  };
};
