type CinemaxxVuePromoLabel = {
  names: { name: string; class: string; short_name: string }[];
  position: string;
  isborder: boolean;
};

type CinemaxxVueFilmParam = {
  Title: string;
  Link: string | null;
};

type CinemaxxVueTag = {
  link: string | null;
  name: string;
  class: string | null;
  target_blank: boolean;
};

type CinemaxxVueSchedule = {
  Time: string;
  BookingLink: string;
  VersionTitle: string;
  FirstClass: boolean;
  EventInfo: string | null;
  ScreenNumber: string;
  PromoTypes: unknown[];
};

type CinemaxxVueCinema = {
  WhatsOnAlphabeticShedules: CinemaxxVueSchedule[];
  CinemaName: string;
  CinemaId: string;
  PromoTypes: unknown[];
};

type CinemaxxVueDay = {
  WhatsOnAlphabeticCinemas: CinemaxxVueCinema[];
  DayTitle: string;
};

type CinemaxxVueFilm = {
  WhatsOnAlphabeticCinemas: CinemaxxVueDay[];
  Synopsis: string;
  ShortSynopsis: string;
  RankValue: string;
  RankVotes: string;
  PromoLabels: CinemaxxVuePromoLabel;
  IsEvent: boolean;
  Title: string;
  FilmId: string;
  SortField: string;
  SortFieldCommingSoon: string;
  Poster: string;
  PosterAlt: string;
  PosterAria: string;
  TrailerUrl: string | null;
  TrailerType: string | null;
  TrailerAria: string;
  FilmParams: CinemaxxVueFilmParam[];
  tags: CinemaxxVueTag[];
  FilmUrl: string;
  ReleaseDate: string;
  HeroMobileImage: string | null;
  WantSee: string;
  ShowWantSee: boolean;
  RateFilmAvaiable: boolean;
  PegiClass: string;
  CertificateAge: string;
  PegiHref: string;
};

export type CinemaxxVueWhatsOnResponse = {
  WhatsOnAlphabeticFilms: CinemaxxVueFilm[];
  cdata: string | null;
};
