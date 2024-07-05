type PremiumKinoDescriptor = Record<string, string>;

type PremiumKinoPoster = {
  small: string;
  medium: string;
  large: string;
  original: string;
  title: string;
};

type PremiumKinoPerformance = {
  crypt_id: string;
  movie_crypt_id: string;
  oid: string;
  begin: string;
  end: string;
  slug: string;
  auditorium: string;
  title: string;
  release_type: string;
  release_type_image: string;
  release_type_crypt_id: string;
  auditorium_crypt_id: string;
  fsk: number;
  time: number;
  bookable: boolean;
  reservable: boolean;
  is_assigned_seating: boolean;
  is_open_air_cinema: boolean;
  filters: string[];
  filter_type: string;
  restriction: {
    max_seats_per_selection: number;
  };
  max_booking_time: number;
  needs_registration: boolean;
  workload: number;
  language: string;
  lang_icon: string;
  seating_area_usage_1: number;
  seating_area_usage_2: number;
  is_cancelable: boolean;
};

type PremiumKinoScene = {
  small: string;
  medium: string;
  large: string;
  original: string;
  title: string;
  copyright: string;
};

type PremiumKinoTrailer = {
  crypt_id: string;
  name: string;
  url1080: string;
  url720: string;
  url640: string;
  url480: string;
  duration: number;
  rating: number;
  publish: string;
};

export type PremiumKinoMovie = {
  crypt_id: string;
  name: string;
  slug: string;
  description_short: string;
  description_long: string;
  descriptors: PremiumKinoDescriptor;
  poster: PremiumKinoPoster;
  genre: string;
  country: string;
  filters: string[];
  minutes: number;
  fsk: number;
  year: number;
  date_insert: string;
  date_start: string;
  date_sort: string;
  performances: PremiumKinoPerformance[];
  scenes: PremiumKinoScene[];
  trailers: PremiumKinoTrailer[];
  show: boolean;
};
