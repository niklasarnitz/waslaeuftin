export type KinoHeldCinemaData = {
  id: number;
  cid: string;
  name: string;
  urlSlug: string;
  city: {
    id: number;
    name: string;
  };
};

type KinoHeldCinemasDataInner = {
  paginatorInfo: {
    count: number;
    currentPage: number;
    firstItem: number;
    hasMorePages: boolean;
    lastItem: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  data: KinoHeldCinemaData[];
};

export type KinoHeldCinemasResponse = {
  cinemas: KinoHeldCinemasDataInner;
};
