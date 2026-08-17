export interface ListingCity {
  slug: string;
  name: string;
}

export interface ListingCinema {
  id: number;
  slug: string;
  name: string;
  city?: ListingCity;
  distanceKm?: number | null;
  href?: string;
}

export interface ListingShowing {
  id: number;
  dateTime: Date | string;
  bookingUrl?: string | null;
  rawMovieName?: string;
  showingAdditionalData?: string[] | null;
  tags?: string[];
}

export interface ListingCinemaEntry {
  cinema: ListingCinema;
  showings: ListingShowing[];
  nextShowing?: ListingShowing;
}

export interface ListingMovieCard {
  name: string;
  coverUrl: string | null;
  tmdbPopularity?: number | null;
  tmdbMetadata?: TmdbMetadata | null;
  cinemaEntries?: ListingCinemaEntry[];
  cinemas: ListingCinemaEntry[];
  showingsCount: number;
  nextShowing?: ListingShowing;
  nextShowingDate?: Date;
}

export interface CinemaFilterOption {
  id: number;
  slug: string;
  name: string;
}

export interface TmdbMetadata {
  tmdbId?: number | null;
  title?: string | null;
  originalTitle?: string | null;
  originalLanguage?: string | null;
  overview?: string | null;
  tagline?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  popularity?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  status?: string | null;
  homepage?: string | null;
  imdbId?: string | null;
  genres?: string | null;
  certification?: string | null;
  trailerUrl?: string | null;
  directors?:
    | { id: number; name: string; profilePath?: string | null }[]
    | null;
  cast?:
    | {
        id: number;
        name: string;
        character?: string | null;
        profilePath?: string | null;
      }[]
    | null;
  crew?:
    | {
        id: number;
        name: string;
        job: string;
        department: string;
        profilePath?: string | null;
      }[]
    | null;
  productionCompanies?:
    | {
        id: number;
        name: string;
        logoPath?: string | null;
        originCountry?: string;
      }[]
    | null;
  keywordsJson?: unknown;
  [key: string]: unknown;
}
