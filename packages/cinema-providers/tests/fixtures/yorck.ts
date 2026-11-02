// Minimized public SSR/API shapes. Session 1001-87842 deliberately uses native
// HO00005613, not the conflicting Kinoheld "Kanal" identity in the research.
export const yorckFixture = () => {
  const cmsSession = (sessionId: string, startTime: string) => ({
    sys: { id: sessionId },
    fields: { startTime, formats: ["OmU"] },
  });
  const film = (
    filmId: string,
    slug: string,
    sessions: ReturnType<typeof cmsSession>[],
  ) => ({
    sys: { id: filmId },
    fields: {
      vistaId: filmId,
      title: "Der Astronaut",
      slug,
      runtime: 120,
      sessions,
    },
  });
  const firstSession = cmsSession("1001-87842", "2026-12-04T18:00:00+01:00");
  const films = [
    film("HO00005613", "der-astronaut", [firstSession]),
    film("HO00009999", "another-astronaut", [
      cmsSession("1001-99999", "2026-07-04T20:00:00+02:00"),
    ]),
  ];
  const apiSession = (
    ID: string,
    ScheduledFilmId: string,
    Showtime: string,
  ) => ({
    ID,
    CinemaId: ID.split("-")[0] ?? "",
    SessionId: ID.split("-")[1] ?? "",
    ScheduledFilmId,
    Showtime,
    ScreenName: "B",
    ScreenNumber: 2,
    SessionAttributesNames: ["OmeU"],
    ConceptAttributesNames: [],
    FormatCode: "0000000006",
    IsAllocatedSeating: true,
    SeatsAvailable: 0,
    AllowTicketSales: false,
    SoldoutStatus: 0,
    SalesChannels: ["WWW"],
    TypeCode: "N",
  });
  return {
    special: {
      sessions: [
        {
          ...firstSession,
          fields: {
            ...firstSession.fields,
            film: { fields: { slug: "der-astronaut" } },
          },
        },
      ],
    },
    venue: {
      cinema: {
        sys: { id: "1001" },
        fields: { vistaId: "1001", slug: "delphi-lux" },
      },
      filmsSpecials: [
        ...films,
        {
          sys: { id: "0000000006" },
          fields: {
            title: "Filmreihe 2030",
            slug: "filmreihe-2030",
            assignedFilms: { fields: { title: "The Great Green Wall" } },
            sessions: [firstSession, firstSession],
          },
        },
      ],
    },
    api: {
      value: [
        apiSession("1001-87842", "HO00005613", "2026-12-04T18:00:00"),
        apiSession("1001-99999", "HO00009999", "2026-07-04T20:00:00"),
        apiSession("1002-87842", "HO00005613", "2026-12-04T18:00:00"),
      ],
    },
    details: films.map((entry, index) => ({
      film: {
        ...entry,
        fields: {
          ...entry.fields,
          originalTitle: index ? "Other original" : "Project Hail Mary",
          originalLanguage: "Englisch",
          year: 2026,
          director: "Fixture Director",
          tmdbId: 100 + index,
          cast: "Fixture Cast",
          writer: "Fixture Writer",
          countries: ["USA"],
          about: "<p>Synopsis</p>",
        },
      },
    })),
  };
};
