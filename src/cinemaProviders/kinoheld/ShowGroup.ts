export interface ShowGroup {
  uuid: string;
  name: string;
  movie: {
    id: string;
    title: string;
    urlSlug: string;
    duration: number;
    description: string;
    additionalDescription: string | null;
    additionalInfo: string | null;
    distributor: string;
    publisherUrl: string | null;
    released: string;
    startdate: string;
    productionYear: string | null;
    productionCountries: {
      name: string | null;
    };
    heroImageAlignment: string;
    contentRating: {
      id: string;
      aliases: string | null;
      contentRatingSystem: {
        name: string | null;
      };
      description: string;
      icon: {
        url: string;
        colors: string[];
      };
      minimumAge: number;
      minimumAgeAccompanied: number;
      name: string;
    } | null;
    jugendFilmJury: null;
    thumbnailImage: {
      id: string;
      url: string;
      colors: string[];
      width: number;
      height: number;
      license: string | null;
      licenseUrl: string | null;
      credit: string | null;
    };
    hasTrailers: boolean;
    hasMedia: boolean;
    genres: ({
      id: string;
      name: string;
      urlSlug: string;
    } | null)[];
  };
  cinema: {
    city: {
      id: string;
      distance: number | null;
      latitude: number;
      urlSlug: string;
      longitude: number;
      name: string;
      timezone: string;
    };
  };
  shows: {
    data: ({
      id: string;
      name: string;
      urlSlug: string;
      admission: string;
      beginning: string;
      endreservation: string;
      endsale: string;
      startreservation: string;
      startsale: string;
      deeplink: string | null;
      flags:
        | ({
            category: string;
            isCinemaSpecific: boolean;
            description: string;
            code: string;
            name: string;
          } | null)[]
        | null;
      auditorium: {
        id: string;
        name: string;
      } | null;
    } | null)[];
  };
}
