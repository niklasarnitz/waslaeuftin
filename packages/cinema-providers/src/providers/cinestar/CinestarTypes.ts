export type CineStarAttribute = {
  id: string;
  icon: null | string;
  name: null | string;
};

export type CineStarEventType = {
  _type: string;
  id: number;
  cinema: number;
  blockbuster: boolean;
  title: string;
  subtitle: string;
  hasTrailer: boolean;
  attributes: string[];
  showtimes: CineStarShowtime[];
  date: string;
  poster_preload: string;
  poster: string;
  event: number;
  movie: number;
  detailLink: string;
  showtimeSchedule: CineStarShowtimeSchedule;
  startDate: string;
  endDate: string | null;
};

type CineStarShowtime = {
  id: number;
  name: string;
  cinema: number;
  datetime: string;
  emv: number;
  fsk: number;
  systemId: string;
  system: string;
  show: number;
  attributes: string[];
  screen: number;
};

type CineStarShowtimeSchedule = {
  id: number;
  datetime: string;
  text: string;
  type: string | null;
};
