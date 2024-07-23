type Attribute = {
  name: string;
  shortName: string;
  value: string;
  description: string;
  attributeType: string;
  iconName: string | null;
};

type Session = {
  sessionId: string;
  bookingUrl: string;
  formattedPrice: string;
  isPriceVisible: boolean;
  duration: number;
  startTime: string;
  endTime: string;
  showTimeWithTimeZone: string;
  isSoldOut: boolean;
  color: string | null;
  isMidnightSession: boolean;
  isBookingAvailable: boolean;
  attributes: Attribute[];
  screenName: string;
  sessionPricingDisplayStatus: number;
};

type ShowingGroup = {
  date: string;
  datePrefix: string;
  pricingTypes: unknown[]; // Assuming pricingTypes is an array with no specified structure
  sessions: Session[];
};

type Certificate = {
  name: string;
  description: string;
  src: string;
};

type FilmAttribute = {
  name: string;
  shortName: string;
  value: string;
  description: string;
  attributeType: string;
  iconName: string | null;
};

export type MyVueFilm = {
  showingGroups: ShowingGroup[];
  filmId: string;
  certificate: Certificate;
  secondaryCertificates: unknown[]; // Assuming secondaryCertificates is an array with no specified structure
  filmUrl: string;
  filmAttributes: FilmAttribute[];
  posterImageSrc: string;
  cast: string;
  releaseDate: string;
  runningTime: number;
  isDurationUnknown: boolean;
  synopsisShort: string;
  filmTitle: string;
  hasSessions: boolean;
  hasTrailer: boolean;
  embargoMessage: string;
  embargoEndDate: string | null;
  embargoLevel: string | null;
  alternativeCertificate: Certificate;
  panelImageUrl: string;
  filmStatus: number;
  trailers: unknown[]; // Assuming trailers is an array with no specified structure
  director: string;
  distributor: string;
  movieXchangeCode: string;
  crossCountryMovieXchangeId: string;
  originalTitle: string;
  showingInCinemas: string[];
  genres: string[];
  sessionAttributes: Attribute[];
};
