// New API types for the updated PremiumKino API
type PremiumKinoPoster = {
  src: string;
  title: string;
  alternate?: string;
  width: number;
  height: number;
};

type PremiumKinoScene = {
  src: string;
  title: string;
  alternate?: string;
  copyright?: string;
  width: number;
  height: number;
};

type PremiumKinoTranslation = {
  id: string;
  language: string;
  flag: string;
  name: string;
  descShort: string;
  descLong: string;
};

export type PremiumKinoMovie = {
  id: string;
  name: string;
  slug: string;
  poster: PremiumKinoPoster;
  scenes: PremiumKinoScene[];
  genreIds: string[];
  descriptorIds: string[];
  filterIds: string[];
  minutes: number;
  rating: number;
  year: number;
  country: string;
  dateCreated: string;
  dateModified: string;
  dateStart: string;
  dateSort: string;
  translations: PremiumKinoTranslation[];
  performanceIds: string[];
};

export type PremiumKinoPerformance = {
  id: string;
  movieId: string;
  seatingPlanId: string;
  auditoriumId: string;
  releaseTypeId: string;
  cinemaDay: string;
  begin: string;
  end: string;
  title: string;
  slug: string;
  rating: number;
  bookable: boolean;
  reservable: boolean;
  isAssignedSeating: boolean;
  seatCountLow?: boolean;
  workload: number;
  language: string;
  langIcon: string;
  seatingAreaUsage1: number;
  seatingAreaUsage2: number;
  filterIds: string[];
};

export type PremiumKinoApiResponse = {
  movies: PremiumKinoMovie[];
  performances: PremiumKinoPerformance[];
  auditoriumUsed: unknown[];
  dates: unknown[];
  events: unknown[];
  movieFilterGroups: unknown[];
  navigation: unknown;
  notices: unknown[];
  teaserBanners: unknown[];
  teaserMovieExtras: unknown[];
  teaserPerformanceGroups: unknown[];
  teaserSeatingPlans: unknown[];
  teaserShopCartConsents: unknown[];
  teaserSliders: unknown[];
};
