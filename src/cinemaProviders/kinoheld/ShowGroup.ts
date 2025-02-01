export interface ShowGroup {
  uuid: string;
  urlSlug: string;
  movie: {
    title: string;
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
