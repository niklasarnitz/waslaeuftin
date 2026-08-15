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
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries?: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  spoken_languages?: Array<{
    iso_639_1: string;
    name: string;
    english_name?: string;
  }>;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character?: string | null;
      profile_path?: string | null;
      order?: number;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path?: string | null;
    }>;
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
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

