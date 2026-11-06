export interface ShowGroup {
  uuid: string;
  urlSlug: string;
  movie: {
    id?: string | null;
    title: string;
    titleOriginal?: string | null;
    productionYear?: string | null;
    duration?: number | null;
    directors?: ({ name?: string | null } | null)[] | null;
    trailers?:
      | ({ format?: string | null; remoteVideoId?: string | null } | null)[]
      | null;
  };
  cinema: {
    urlSlug: string;
    city: {
      urlSlug: string;
    };
  };
  shows: {
    data: ({
      id: string;
      name: string;
      urlSlug: string;
      beginning: string;
      auditorium: {
        name: string | null;
      } | null;
      audioLanguage: {
        name: string | null;
      } | null;
      subtitleLanguage: {
        name: string | null;
      } | null;
      movie: {
        title: string;
      };
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
    } | null)[];
  };
}
