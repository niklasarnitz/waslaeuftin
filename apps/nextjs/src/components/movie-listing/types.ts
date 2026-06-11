export type ListingCity = {
  slug: string;
  name: string;
};

export type ListingCinema = {
  id: number;
  slug: string;
  name: string;
  city?: ListingCity;
  distanceKm?: number | null;
  href: string;
};

export type ListingShowing = {
  id: number;
  dateTime: Date;
  bookingUrl?: string | null;
  rawMovieName: string;
  showingAdditionalData?: string[] | null;
  tags: string[];
};

export type ListingCinemaEntry = {
  cinema: ListingCinema;
  showings: ListingShowing[];
  nextShowing?: ListingShowing;
};

export type ListingMovieCard = {
  name: string;
  coverUrl: string | null;
  tmdbPopularity: number | null;
  cinemaEntries: ListingCinemaEntry[];
  showingsCount: number;
  nextShowing?: ListingShowing;
};

export type CinemaFilterOption = {
  id: number;
  slug: string;
  name: string;
};
