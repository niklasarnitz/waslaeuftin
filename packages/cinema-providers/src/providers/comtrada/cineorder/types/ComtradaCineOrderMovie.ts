export type ComtradaCineOrderMovie = {
  id: string;
  performances: ComtradaCineOrderMoviePerformance[];
  filmNumber: number;
  filmEDI: string;
  productionYear: string;
  name: string;
  title: string;
  ticketTitle: string;
  originalTitle: string;
  lengthInMinutes: number;
  synopsis: string;
  imageUrl: string;
  nationwideStart: string;
  ageRating: string;
  ageRatingInformation: AgeRatingInformation;
  director: string;
};

export type ComtradaCineOrderMoviePerformance = {
  id: string;
  name: string;
  title: string;
  ticketTitle: string;
  displayTitle: string;
  performanceDateTime: string;
  cinemaDate: string;
  auditoriumName: string;
  auditoriumNumber: number;
  auditoriumId: string;
  auditorium: Auditorium;
  releaseTypeName: string;
  releaseTypeNumber: number;
  is3D: boolean;
  filmId: string;
  filmTitle: string;
  filmReleaseId: string;
  weekfilmSortOrderPrio: number;
  access: Access;
  useAssignedSeating: boolean;
  filmReleaseCode: string;
  limitations: Limitations;
  iceBreakInMinutes: number;
  cleanUpTimeInMinutes: number;
  soundSystem: string;
  pictureFormat: string;
  weekFilmType: string;
  originalFilmTitle: string;
};

export interface Auditorium {
  id: string;
  name: string;
  number: number;
}

export interface Access {
  reservationsOnly: boolean;
  salesOnly: boolean;
  viewOnly: boolean;
}

export interface Limitations {
  purchaseUntil: string;
}

export interface AgeRatingInformation {
  name: string;
  acceptanceMethod: string;
}
