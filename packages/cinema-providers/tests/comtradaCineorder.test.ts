import { expect, spyOn, test } from "bun:test";

import { getComtradaCineOrderMovies } from "@waslaeuftin/cinema-providers/server";

const metadata = (backendUrl: string, centerShorty: string) => ({
  id: -1,
  backendUrl,
  centerShorty,
  centerId: "center",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const withPages = async (
  pages: Record<string, string | Response>,
  run: () => Promise<void>,
) => {
  const request = spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const page = pages[url];
    if (page === undefined)
      throw new Error(`Unexpected programme request: ${url}`);
    return Promise.resolve(
      typeof page === "string" ? new Response(page) : page.clone(),
    );
  });
  try {
    await run();
  } finally {
    request.mockRestore();
  }
};

const embedded = (name: string, data: unknown) =>
  `<script>var ${name} = ${JSON.stringify(data)}; var unrelated = {};</script>`;

test("Kinopolis imports all film dates, including presales, with stable film IDs and Berlin time", async () => {
  const base = "https://www.kinopolis.de/vi";
  const film = (
    id: string,
    title: string,
    label: string,
    time: string,
  ) => `<body data-x-date="2027-12-31 22:00:00x">
    <h1>${title} / <span class="hl--sub">Original ${title}</span></h1>
    <div class="movie__specs-el"><span class="movie__specs-title">Produktionsjahr:</span>2003</div>
    <div class="movie__specs-el"><span class="movie__specs-title">Dauer:</span>120 Minuten</div>
    <div data-performance-ids=[${id}]><div class="prog-nav__day">${label}</div></div>
    <div data-performance-id="${id}"><a class="prog2__time" href="/vi/programm/vorstellung/${id}">${time}</a>
      <div class="prog2__hall-num">Kino 7</div><div class="prog2__tech"><span class="tech__icon tech__3d">3D</span><a class="tech__icon tech__atmos"></a><a class="tech__icon tech__dbox"></a></div>
    </div></body>`;
  const listing = (id: string) =>
    `<script>centerid = 'center';</script><a href="/vi/filmdetail/title/${id}">Film</a>`;
  await withPages(
    {
      [`${base}/programm`]: listing("oldboy"),
      [`${base}/vorverkauf`]: listing("presale") + listing("oldboy"),
      [`${base}/filmdetail/title/oldboy`]: film(
        "s1",
        "Oldboy",
        "Morgen",
        "00:30",
      ),
      [`${base}/filmdetail/title/presale`]: film(
        "s2",
        "Presale",
        "Di. 29.02.",
        "19:45",
      ),
    },
    async () => {
      const result = await getComtradaCineOrderMovies(
        1474,
        metadata("https://ts.kinopolis.de", "rnz"),
      );
      expect(result.movies).toHaveLength(2);
      expect(result.movies[0]).toMatchObject({
        cinemaId: 1474,
        name: "Oldboy",
        providerFilmId: "oldboy",
        evidence: {
          productionYear: 2003,
          originalTitle: "Original Oldboy",
          runtimeMinutes: 120,
        },
      });
      expect(
        result.showings.map((s) => [
          s.providerFilmId,
          s.dateTime.toISOString(),
          s.bookingUrl,
        ]),
      ).toEqual([
        [
          "oldboy",
          "2027-12-31T23:30:00.000Z",
          `${base}/programm/vorstellung/s1`,
        ],
        [
          "presale",
          "2028-02-29T18:45:00.000Z",
          `${base}/programm/vorstellung/s2`,
        ],
      ]);
      expect(result.showings[0]?.showingAdditionalData).toEqual([
        "Kino 7",
        "3D",
        "ATMOS",
        "DBOX",
      ]);
    },
  );
});

const pmkino = () => ({
  cliData: { currentCinemaId: "cinema-a" },
  apiData: {
    cinemas: {
      items: {
        "cinema-a": {
          scope: {
            cinemaDataProvider: {
              shopCenterId: "center",
              shopUrl: "https://iframe.cineorder.forumcinemas.de/",
            },
          },
        },
      },
    },
    movies: {
      items: {
        "pk-a": {
          id: "film-a",
          title: 'Oldboy; {a "quote"}',
          origTitle: "올드보이",
          productionYear: 2003,
          length: 120,
          directors: [{ name: "Park Chan-wook" }],
        },
        "pk-variant": { id: "film-a", title: "Oldboy (OV)" },
      },
    },
    extraMovies: {
      items: {
        "pk-b": { id: "film-b", title: "Oldboy", productionYear: 2013 },
      },
    },
    performances: {
      items: {
        a: {
          id: "show-a",
          moviePk: "pk-a",
          cinema: "cinema-a",
          timeUtc: 1796148000000,
          theatreName: "Kino 2",
          attributes: [{ name: "OmU" }],
        },
        variant: {
          id: "show-variant",
          moviePk: "pk-variant",
          cinema: "cinema-a",
          timeUtc: 1796151600000,
        },
        b: {
          id: "show-b",
          moviePk: "pk-b",
          cinema: "cinema-a",
          timeUtc: 1796155200000,
        },
        foreign: {
          id: "show-other",
          moviePk: "missing",
          cinema: "cinema-other",
          timeUtc: 0,
        },
      },
    },
  },
});

test("Forum joins presentation variants and extra films by source ID without importing another cinema", async () => {
  await withPages(
    {
      "https://rastatt.forumcinemas.de/programmuebersicht/": embedded(
        "pmkinoFrontVars",
        pmkino(),
      ),
    },
    async () => {
      const result = await getComtradaCineOrderMovies(
        8,
        metadata("https://cineorder.forumcinemas.de", "fra"),
      );
      expect(result.movies.map((m) => m.providerFilmId)).toEqual([
        "film-a",
        "film-b",
      ]);
      expect(result.movies[0]?.evidence).toEqual({
        productionYear: 2003,
        originalTitle: "올드보이",
        runtimeMinutes: 120,
        director: "Park Chan-wook",
      });
      expect(result.showings.map((s) => s.providerFilmId)).toEqual([
        "film-a",
        "film-a",
        "film-b",
      ]);
      expect(result.showings[0]?.dateTime.toISOString()).toBe(
        "2026-12-01T18:00:00.000Z",
      );
      expect(result.showings[0]?.bookingUrl).toBe(
        "https://iframe.cineorder.forumcinemas.de/landingpage?center=center&language=DE&page=seatingplan&performance=show-a",
      );
      expect(result.showings[0]?.showingAdditionalData).toEqual([
        "Kino 2",
        "OmU",
      ]);
    },
  );
});

test("Gernsbach normalizes singleton and array screenings, preserves individual booking links and omits unknown evidence", async () => {
  const booking = (id: string) =>
    `https://iframe.cineorder.kinocentergernsbach.de/landingpage?center=center&FilmID=film-source&performance=${id}`;
  const screening = (datum: string, zeit: string, id: string) => ({
    datum,
    zeit,
    link_desktop: booking(id),
    link_fixticket: booking("wrong-first-show"),
    saal_bezeichnung: "Kino 1",
  });
  const data = {
    filme: {
      film_42: {
        filmfakten: {
          idf: "42",
          titel: "Rocky",
          director: "John G. Avildsen",
          laufzeit: "119",
          Versionsmarker: {},
        },
        vorstellungen: {
          vorstellungen_fakten: {
            DolbySiebenEins: "1",
            GretaStarks: "1",
            DolbyAtmos: {},
          },
          termine: {
            "datum_2026-12-01": screening("2026-12-01", "19:15", "winter"),
            "datum_2027-07-02": [
              screening("2027-07-02", "17:15", "summer-a"),
              screening("2027-07-02", "19:30", "summer-b"),
            ],
          },
        },
      },
    },
  };
  await withPages(
    {
      "https://www.kinocentergernsbach.de/programm?filter=all": embedded(
        "programm",
        data,
      ),
    },
    async () => {
      const result = await getComtradaCineOrderMovies(
        43,
        metadata("https://cineorder.kinocentergernsbach.de", "kcgernsbach"),
      );
      expect(result.movies[0]?.evidence).toEqual({
        director: "John G. Avildsen",
        runtimeMinutes: 119,
      });
      expect(
        result.showings.map((s) => [s.dateTime.toISOString(), s.bookingUrl]),
      ).toEqual([
        ["2026-12-01T18:15:00.000Z", booking("winter")],
        ["2027-07-02T15:15:00.000Z", booking("summer-a")],
        ["2027-07-02T17:30:00.000Z", booking("summer-b")],
      ]);
      expect(result.showings[2]?.showingAdditionalData).toEqual([
        "Kino 1",
        "Dolby 7.1",
        "Greta & Starks",
      ]);
    },
  );
});

test("blocked, malformed, empty and wrong-cinema programmes fail instead of returning a successful empty catalog", async () => {
  const url = "https://rastatt.forumcinemas.de/programmuebersicht/";
  const wrongCinema = pmkino();
  wrongCinema.cliData.currentCinemaId = "other";
  const data = pmkino();
  const empty = {
    ...data,
    apiData: { ...data.apiData, performances: { items: {} } },
  };
  for (const page of [
    new Response("Blocked", { status: 403 }),
    "<html>Maintenance</html>",
    embedded("pmkinoFrontVars", empty),
    embedded("pmkinoFrontVars", wrongCinema),
  ]) {
    await withPages({ [url]: page }, async () => {
      const result = await getComtradaCineOrderMovies(
        8,
        metadata("https://cineorder.forumcinemas.de", "fra"),
      ).catch((error: unknown) => error);
      expect(result).toBeInstanceOf(Error);
    });
  }
});
