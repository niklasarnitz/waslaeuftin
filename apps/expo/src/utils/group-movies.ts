export interface Showing {
  id: number;
  dateTime: Date | string;
  bookingUrl: string | null;
  showingAdditionalData: string[];
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
  budget?: any;
  revenue?: any;
  popularity?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  status?: string | null;
  homepage?: string | null;
  imdbId?: string | null;
  genres?: string | null;
  certification?: string | null;
  trailerUrl?: string | null;
  directors?: Array<{ id: number; name: string; profilePath?: string | null }> | null;
  cast?: Array<{ id: number; name: string; character?: string | null; profilePath?: string | null }> | null;
  crew?: Array<{ id: number; name: string; job: string; department: string; profilePath?: string | null }> | null;
  productionCompanies?: Array<{ id: number; name: string; logoPath?: string | null; originCountry?: string }> | null;
  productionCountries?: Array<{ iso_3166_1: string; name: string }> | null;
  spokenLanguages?: Array<{ iso_639_1: string; name: string; englishName?: string }> | null;
  collectionJson?: { id: number; name: string; posterPath?: string | null; backdropPath?: string | null } | null;
  keywordsJson?: Array<{ id: number; name: string }> | null;
}

export interface Movie {
  name: string;
  coverUrl: string | null;
  showings: Showing[];
  tmdbMetadata?: TmdbMetadata | null;
}

export interface Cinema {
  id: number;
  name: string;
  slug: string;
  distanceKm?: number;
  city?: { name: string; slug: string };
}

export interface GroupedMovieCinemaEntry {
  cinema: Cinema;
  showings: Showing[];
}

export interface GroupedMovie {
  name: string;
  coverUrl: string | null;
  cinemas: GroupedMovieCinemaEntry[];
  showingsCount: number;
  nextShowingDate?: Date;
  tmdbMetadata?: TmdbMetadata | null;
}

export function groupCinemasByMovie(
  cinemas: (Cinema & { movies: Movie[] })[],
): GroupedMovie[] {
  const groupedMap = new Map<string, GroupedMovie>();

  for (const cinema of cinemas) {
    for (const movie of cinema.movies) {
      if (movie.showings.length === 0) continue;

      let grouped = groupedMap.get(movie.name);
      if (!grouped) {
        grouped = {
          name: movie.name,
          coverUrl: movie.coverUrl,
          cinemas: [],
          showingsCount: 0,
          tmdbMetadata: movie.tmdbMetadata,
        };
        groupedMap.set(movie.name, grouped);
      }

      grouped.cinemas.push({
        cinema: {
          id: cinema.id,
          name: cinema.name,
          slug: cinema.slug,
          distanceKm: cinema.distanceKm,
          city: cinema.city,
        },
        showings: movie.showings,
      });
      grouped.showingsCount += movie.showings.length;
      if (!grouped.coverUrl && movie.coverUrl) {
        grouped.coverUrl = movie.coverUrl;
      }
    }
  }

  const result = Array.from(groupedMap.values());

  // Sort cinemas in each movie: closer distance first
  for (const movie of result) {
    movie.cinemas.sort((a, b) => {
      if (
        a.cinema.distanceKm !== undefined &&
        b.cinema.distanceKm !== undefined
      ) {
        return a.cinema.distanceKm - b.cinema.distanceKm;
      }
      return a.cinema.name.localeCompare(b.cinema.name);
    });
  }

  // Calculate next showing date for sorting movies
  for (const movie of result) {
    let minDate: Date | null = null;
    for (const c of movie.cinemas) {
      for (const showing of c.showings) {
        const date = new Date(showing.dateTime);
        if (!minDate || date < minDate) {
          minDate = date;
        }
      }
    }
    if (minDate) {
      movie.nextShowingDate = minDate;
    }
  }

  // Sort movies alphabetically by name, matching the web default sort order
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}
