import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

const upsertedMovies: unknown[] = [];
const createdShowings: unknown[] = [];
let existingMovies: Array<{
  id: number;
  canonicalKey: string;
  name: string;
  normalizedTitle: string;
  tmdbMovieId: number | null;
  coverUrl: string | null;
  coverStorageKey: string | null;
  coverConfidence: number | null;
  tmdbSearchFailedOn: Date | null;
}> = [];
let storedTmdbMetadataIds = new Set<number>();
type AcceptedCandidate = {
  tmdbMovieId: number;
  title: string;
  posterPath: string | null;
  confidence: number;
};
let acceptedCandidate: AcceptedCandidate | null = null;
let fetchTmdbMovieDetailsError: Error | null = null;
let evaluationError: Error | null = null;
const acceptedCandidatesByYear = new Map<number, AcceptedCandidate>();
let cachedShowings: object[] = [];

const replacementTransaction = {
  showing: {
    deleteMany: mock(async (_params: unknown) => ({ count: 1 })),
    createMany: mock(async (params: { data: unknown[] }) => ({
      count: params.data.length,
    })),
  },
  cinema: { update: mock(async (_params: unknown) => ({})) },
};

const db = {
  $transaction: mock(
    (callback: (tx: typeof replacementTransaction) => Promise<number>) =>
      callback(replacementTransaction),
  ),
  movie: {
    findMany: mock(async () => existingMovies),
    upsert: mock(async (params: { create: { canonicalKey: string } }) => {
      upsertedMovies.push(params.create);
      return {
        id: upsertedMovies.length,
        canonicalKey: params.create.canonicalKey,
      };
    }),
  },
  tmdbMetadata: {
    findMany: mock(async (params: { where: { tmdbId: { in: number[] } } }) =>
      params.where.tmdbId.in
        .filter((tmdbId) => storedTmdbMetadataIds.has(tmdbId))
        .map((tmdbId) => ({ tmdbId })),
    ),
  },
  showing: {
    findMany: mock(async () => cachedShowings),
    updateMany: mock(async (_params: unknown) => ({ count: 1 })),
    createMany: mock(async (params: { data: unknown[] }) => {
      createdShowings.push(...params.data);
      return { count: params.data.length };
    }),
    deleteMany: mock(async () => ({ count: 0 })),
  },
};

mock.module("@waslaeuftin/db/client", () => ({ db }));
mock.module("@waslaeuftin/env", () => ({
  env: {
    S3_ENDPOINT: "http://localhost:7070",
    S3_FORCE_PATH_STYLE: true,
    S3_ACCESS_KEY_ID: "test",
    S3_SECRET_ACCESS_KEY: "test",
    S3_REGION: "test",
    S3_BUCKET: "test",
    S3_MOVIE_COVERS_PREFIX: "movie-covers",
    TMDB_MIN_CONFIDENCE_SCORE: 0.68,
  },
}));
mock.module("@waslaeuftin/helpers/fileStorage/createS3Client", () => ({
  createS3Client: mock(() => ({})),
}));
mock.module("@waslaeuftin/helpers/fileStorage/assertBucketAccessible", () => ({
  assertBucketAccessible: mock(async () => undefined),
}));
mock.module("@waslaeuftin/helpers/tmdb/fetchTmdbMovieDetails", () => ({
  fetchTmdbMovieDetails: mock(async (tmdbMovieId: number) => {
    if (fetchTmdbMovieDetailsError) {
      throw fetchTmdbMovieDetailsError;
    }

    return {
      id: tmdbMovieId,
      title: "TMDB Title",
      original_title: "TMDB Title",
      original_language: "de",
      overview: null,
      tagline: null,
      poster_path: null,
      backdrop_path: null,
      release_date: null,
      runtime: null,
      budget: 0,
      revenue: 0,
      popularity: 0,
      vote_average: 0,
      vote_count: 0,
      status: "Released",
      adult: false,
      video: false,
      homepage: null,
      imdb_id: null,
      genres: [],
    };
  }),
}));
mock.module("@waslaeuftin/helpers/fileStorage/upsertTmdbMetadata", () => ({
  upsertTmdbMetadata: mock(async () => undefined),
}));
mock.module("@waslaeuftin/helpers/fileStorage/uploadTmdbPosterToS3", () => ({
  uploadTmdbPosterToS3: mock(async () => ({
    publicUrl: "https://example.test/poster.jpg",
    objectKey: "movie-covers/poster.jpg",
  })),
}));

describe("resolveAndPersistCatalog", () => {
  let restoreMatcher: () => void;
  beforeEach(async () => {
    const { TmdbMovieMatcher } =
      await import("@waslaeuftin/helpers/tmdb/TmdbMovieMatcher");
    const spy = spyOn(
      TmdbMovieMatcher.prototype,
      "evaluate",
    ).mockImplementation(async (title, evidence) => {
      if (evaluationError) throw evaluationError;
      const year =
        evidence?.productionYear ?? Number(title.match(/\((\d{4})\)/)?.[1]);
      const candidate = acceptedCandidatesByYear.get(year) ?? acceptedCandidate;
      return {
        requestedTitle: title,
        normalizedTitle: title,
        threshold: 0.68,
        bestCandidate: null,
        acceptedCandidate: candidate
          ? {
              ...candidate,
              originalTitle: candidate.title,
              releaseDate: null,
              popularity: 0,
              sourceQuery: title,
            }
          : null,
      };
    });
    restoreMatcher = () => spy.mockRestore();
  });
  afterEach(() => {
    restoreMatcher();
    upsertedMovies.length = 0;
    createdShowings.length = 0;
    existingMovies = [];
    storedTmdbMetadataIds = new Set<number>();
    acceptedCandidate = null;
    fetchTmdbMovieDetailsError = null;
    evaluationError = null;
    acceptedCandidatesByYear.clear();
    cachedShowings = [];
    db.movie.findMany.mockClear();
    db.movie.upsert.mockClear();
    db.tmdbMetadata.findMany.mockClear();
    db.showing.createMany.mockClear();
    db.showing.updateMany.mockClear();
  });

  test("persists a newly fetched title when it was not already in the movie table", async () => {
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");

    const result = await resolveAndPersistCatalog([
      {
        movies: [{ cinemaId: 10, name: "Brand New Provider Movie" }],
        showings: [
          {
            cinemaId: 10,
            movieName: "Brand New Provider Movie",
            dateTime: new Date("2026-06-01T18:00:00.000Z"),
            bookingUrl: "https://example.test/tickets",
            showingAdditionalData: ["OV"],
          },
        ],
      },
    ]);

    expect(result.canonicalMovies).toBe(1);
    expect(result.tmdbUnmatched).toBe(1);
    expect(upsertedMovies).toHaveLength(1);
    expect(createdShowings).toHaveLength(1);
    expect(createdShowings[0]).toMatchObject({
      cinemaId: 10,
      movieId: 1,
      rawMovieName: "Brand New Provider Movie",
      bookingUrl: "https://example.test/tickets",
      showingAdditionalData: ["OV"],
    });
  });

  test("keeps same-title provider identities separate and persists their evidence", async () => {
    acceptedCandidatesByYear.set(2003, {
      tmdbMovieId: 670,
      title: "Oldboy",
      posterPath: "/old.jpg",
      confidence: 0.93,
    });
    acceptedCandidatesByYear.set(2013, {
      tmdbMovieId: 87516,
      title: "Oldboy",
      posterPath: "/new.jpg",
      confidence: 0.93,
    });
    storedTmdbMetadataIds = new Set([670, 87516]);
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: [2003, 2013].map((productionYear, index) => ({
          cinemaId: 10 + index,
          provider: "ComtradaCineOrder",
          providerFilmId: `oldboy-${productionYear}`,
          movieName: "Oldboy",
          evidence: { productionYear },
          dateTime: new Date("2026-12-01T18:00:00Z"),
        })),
      },
    ]);
    expect(upsertedMovies).toHaveLength(2);
    expect(upsertedMovies[0]).toMatchObject({ tmdbMovieId: 670 });
    expect(upsertedMovies[1]).toMatchObject({ tmdbMovieId: 87516 });
    expect(createdShowings[0]).toMatchObject({
      movieId: 1,
      sourceProvider: "ComtradaCineOrder",
      providerFilmId: "oldboy-2003",
      sourceEvidence: { productionYear: 2003 },
      matcherVersion: expect.any(Number),
      matchEvaluatedAt: expect.any(Date),
    });
    expect(createdShowings[1]).toMatchObject({
      movieId: 2,
      sourceEvidence: { productionYear: 2013 },
    });
  });

  test("does not merge unconfirmed same-title films across cinema/provider film identities", async () => {
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: [
          { cinemaId: 10, provider: "ComtradaCineOrder", providerFilmId: "a" },
          { cinemaId: 10, provider: "ComtradaCineOrder", providerFilmId: "b" },
          { cinemaId: 11, provider: "ComtradaCineOrder", providerFilmId: "a" },
        ].map((source) => ({
          ...source,
          movieName: "Oldboy",
          dateTime: new Date("2026-12-01T18:00:00Z"),
        })),
      },
    ]);
    expect(upsertedMovies).toHaveLength(3);
    expect(createdShowings).toEqual(
      [1, 2, 3].map((movieId) => expect.objectContaining({ movieId })),
    );
  });

  test.each([
    {
      name: "fresh positive",
      matched: true,
      ageHours: 167,
      versionOffset: 0,
      changedEvidence: false,
      reuse: true,
    },
    {
      name: "expired positive",
      matched: true,
      ageHours: 169,
      versionOffset: 0,
      changedEvidence: false,
      reuse: false,
    },
    {
      name: "fresh abstention",
      matched: false,
      ageHours: 23,
      versionOffset: 0,
      changedEvidence: false,
      reuse: true,
    },
    {
      name: "expired abstention",
      matched: false,
      ageHours: 25,
      versionOffset: 0,
      changedEvidence: false,
      reuse: false,
    },
    {
      name: "previous matcher version",
      matched: true,
      ageHours: 1,
      versionOffset: -1,
      changedEvidence: false,
      reuse: false,
    },
    {
      name: "changed provider evidence",
      matched: true,
      ageHours: 1,
      versionOffset: 0,
      changedEvidence: true,
      reuse: false,
    },
  ])(
    "revalidates source decisions: $name",
    async ({ matched, ageHours, versionOffset, changedEvidence, reuse }) => {
      const { MOVIE_MATCHER_VERSION } =
        await import("@waslaeuftin/helpers/tmdb/TmdbMovieMatcher");
      const { resolveAndPersistCatalog } =
        await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
      const evaluatedAt = new Date(Date.now() - ageHours * 60 * 60 * 1000);
      existingMovies = [
        {
          id: 42,
          canonicalKey: matched ? "tmdb:11248" : "source:unconfirmed",
          name: "Vaterland",
          normalizedTitle: "Vaterland",
          tmdbMovieId: matched ? 11248 : null,
          coverUrl: matched ? "https://example.test/old.jpg" : null,
          coverStorageKey: null,
          coverConfidence: null,
          tmdbSearchFailedOn: null,
        },
      ];
      const candidate = {
        tmdbMovieId: 11248,
        title: "Vaterland",
        originalTitle: "Vaterland",
        posterPath: "/old.jpg",
        releaseDate: "1994-01-01",
        popularity: 0,
        confidence: 0.9,
        sourceQuery: "Vaterland",
      };
      cachedShowings = [
        {
          cinemaId: 10,
          movieId: 42,
          rawMovieName: "Vaterland",
          sourceProvider: "TestProvider",
          providerFilmId: "film-a",
          sourceEvidence: {},
          matcherVersion: MOVIE_MATCHER_VERSION + versionOffset,
          matchEvaluatedAt: evaluatedAt,
          matchEvaluation: {
            requestedTitle: "Vaterland",
            normalizedTitle: "vaterland",
            threshold: 0.68,
            bestCandidate: matched ? candidate : null,
            acceptedCandidate: matched ? candidate : null,
          },
        },
      ];
      storedTmdbMetadataIds = new Set([11248, 1437696]);
      acceptedCandidate = {
        tmdbMovieId: 1437696,
        title: "Vaterland",
        posterPath: "/current.jpg",
        confidence: 0.95,
      };
      await resolveAndPersistCatalog([
        {
          provider: "TestProvider",
          movies: [
            {
              cinemaId: 10,
              providerFilmId: "film-a",
              name: "Vaterland",
              evidence: changedEvidence ? { productionYear: 2026 } : {},
            },
          ],
          showings: [
            {
              cinemaId: 10,
              movieName: "Vaterland",
              dateTime: new Date("2026-12-01T18:00:00Z"),
            },
          ],
        },
      ]);
      expect(upsertedMovies[0]).toMatchObject({
        tmdbMovieId: reuse ? (matched ? 11248 : null) : 1437696,
      });
      expect(createdShowings[0]).toMatchObject({
        sourceProvider: "TestProvider",
        providerFilmId: "film-a",
        sourceEvidence: changedEvidence ? { productionYear: 2026 } : {},
        matcherVersion: MOVIE_MATCHER_VERSION,
        matchEvaluatedAt: reuse ? evaluatedAt : expect.any(Date),
      });
    },
  );

  test("does not stamp an API failure as a fresh unmatched decision", async () => {
    evaluationError = new Error("TMDB unavailable");
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: [
          {
            cinemaId: 10,
            movieName: "Oldboy",
            dateTime: new Date("2026-12-01T18:00:00Z"),
          },
        ],
      },
    ]);
    expect(createdShowings[0]).toMatchObject({
      matcherVersion: null,
      matchEvaluatedAt: null,
    });
  });

  test("preserves unknown Sneak identities and persists canonical Sneak/language metadata", async () => {
    acceptedCandidate = {
      tmdbMovieId: 1187059,
      title: "Sneak Over",
      posterPath: "/wrong-film.jpg",
      confidence: 0.95,
    };
    existingMovies = [
      {
        id: 42,
        canonicalKey: "tmdb:611912",
        name: "The Original",
        normalizedTitle: "The Original",
        tmdbMovieId: 611912,
        coverUrl: "https://example.test/wrong.jpg",
        coverStorageKey: "wrong.jpg",
        coverConfidence: 1,
        tmdbSearchFailedOn: null,
      },
    ];
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    const titles = [
      "The Original Sneak",
      "CineSneak - Die Überraschungspreview",
      "OV-Sneak",
      "SNEAK ORIGINAL OV/OmU",
      "Sneak_nov + Filmquiz",
      "Sneak Preview (2024)",
    ];
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: titles.map((movieName, index) => ({
          cinemaId: 10,
          movieName,
          dateTime: new Date(`2026-10-${11 + index}T18:00:00Z`),
          showingAdditionalData: ["Saal 1"],
        })),
      },
    ]);
    expect(upsertedMovies).toHaveLength(titles.length);
    for (const [index, title] of titles.entries()) {
      expect(upsertedMovies[index]).toMatchObject({
        name: title,
        tmdbMovieId: null,
      });
      expect(createdShowings[index]).toMatchObject({
        rawMovieName: title,
        showingAdditionalData: expect.arrayContaining(["Saal 1", "Sneak"]),
      });
    }
    expect(createdShowings[0]).toMatchObject({
      showingAdditionalData: ["Saal 1", "Sneak", "OV"],
    });
    expect(createdShowings[3]).toMatchObject({
      showingAdditionalData: ["Saal 1", "Sneak", "OV", "OmU"],
    });
  });

  test("does not collapse different event seasons into a cached old recording", async () => {
    existingMovies = [
      {
        id: 42,
        canonicalKey: "tmdb:198469",
        name: "Otello",
        normalizedTitle: "Otello",
        tmdbMovieId: 198469,
        coverUrl: "https://example.test/old.jpg",
        coverStorageKey: "old.jpg",
        coverConfidence: 1,
        tmdbSearchFailedOn: null,
      },
    ];
    storedTmdbMetadataIds.add(198469);
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    const titles = ["MET 2025/26: Otello", "MET 2026/27: Otello"];
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: titles.map((movieName, index) => ({
          cinemaId: 10,
          movieName,
          dateTime: new Date(`2026-10-${11 + index}T18:00:00Z`),
        })),
      },
    ]);
    expect(upsertedMovies).toEqual(
      titles.map((name) =>
        expect.objectContaining({ name, tmdbMovieId: null }),
      ),
    );
    expect(createdShowings[0]).toMatchObject({ movieId: 1 });
    expect(createdShowings[1]).toMatchObject({ movieId: 2 });
  });

  test("does not reuse a cached title-only film for an explicitly different release year", async () => {
    existingMovies = [
      {
        id: 42,
        canonicalKey: "tmdb:11248",
        name: "Vaterland",
        normalizedTitle: "Vaterland",
        tmdbMovieId: 11248,
        coverUrl: "https://example.test/old.jpg",
        coverStorageKey: "old.jpg",
        coverConfidence: 1,
        tmdbSearchFailedOn: null,
      },
    ];
    storedTmdbMetadataIds.add(11248);
    storedTmdbMetadataIds.add(1437696);
    acceptedCandidatesByYear.set(2026, {
      tmdbMovieId: 1437696,
      title: "Vaterland",
      posterPath: "/current.jpg",
      confidence: 0.95,
    });
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");

    await resolveAndPersistCatalog([
      {
        movies: [
          { cinemaId: 10, name: "Vaterland" },
          { cinemaId: 10, name: "Vaterland (2026)" },
        ],
        showings: ["Vaterland", "Vaterland (2026)"].map((movieName, index) => ({
          cinemaId: 10,
          movieName,
          dateTime: new Date(`2026-10-${11 + index}T18:00:00Z`),
        })),
      },
    ]);

    expect(upsertedMovies[1]).toMatchObject({
      tmdbMovieId: 1437696,
      normalizedTitle: "Vaterland (2026)",
    });
    expect(createdShowings[0]).toMatchObject({
      movieId: 1,
      rawMovieName: "Vaterland",
    });
    expect(createdShowings[1]).toMatchObject({
      movieId: 2,
      rawMovieName: "Vaterland (2026)",
    });
  });

  test("keeps separate release years when no TMDB match is available", async () => {
    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");
    await resolveAndPersistCatalog([
      {
        movies: [],
        showings: ["Vaterland (1994)", "Vaterland (2026)"].map(
          (movieName, index) => ({
            cinemaId: 10,
            movieName,
            dateTime: new Date(`2026-10-${11 + index}T18:00:00Z`),
          }),
        ),
      },
    ]);

    expect(upsertedMovies).toEqual([
      expect.objectContaining({ name: "Vaterland (1994)", tmdbMovieId: null }),
      expect.objectContaining({ name: "Vaterland (2026)", tmdbMovieId: null }),
    ]);
    expect(createdShowings[0]).toMatchObject({ movieId: 1 });
    expect(createdShowings[1]).toMatchObject({ movieId: 2 });
  });

  test("does not write a TMDB foreign key when metadata persistence fails", async () => {
    acceptedCandidate = {
      tmdbMovieId: 12345,
      title: "Matched TMDB Movie",
      posterPath: null,
      confidence: 0.93,
    };
    fetchTmdbMovieDetailsError = new Error("TMDB details unavailable");

    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");

    const result = await resolveAndPersistCatalog([
      {
        movies: [{ cinemaId: 10, name: "Provider Movie" }],
        showings: [
          {
            cinemaId: 10,
            movieName: "Provider Movie",
            dateTime: new Date("2026-06-01T18:00:00.000Z"),
            bookingUrl: "https://example.test/tickets",
            showingAdditionalData: [],
          },
        ],
      },
    ]);

    expect(result.tmdbMatched).toBe(1);
    expect(upsertedMovies).toHaveLength(1);
    expect(upsertedMovies[0]).toMatchObject({
      canonicalKey: "tmdb:12345",
      name: "Matched TMDB Movie",
      tmdbMovieId: null,
    });
    expect(createdShowings).toHaveLength(1);
  });

  test("does not keep an existing TMDB foreign key when the metadata row is missing", async () => {
    existingMovies = [
      {
        id: 42,
        canonicalKey: "tmdb:67890",
        name: "Existing Movie",
        normalizedTitle: "Existing Movie",
        tmdbMovieId: 67890,
        coverUrl: "https://example.test/poster.jpg",
        coverStorageKey: "movie-covers/existing.jpg",
        coverConfidence: 0.8,
        tmdbSearchFailedOn: null,
      },
    ];
    const { MOVIE_MATCHER_VERSION } =
      await import("@waslaeuftin/helpers/tmdb/TmdbMovieMatcher");
    cachedShowings = [
      {
        cinemaId: 10,
        movieId: 42,
        rawMovieName: "Existing Movie",
        sourceProvider: "unknown",
        providerFilmId: null,
        sourceEvidence: {},
        matcherVersion: MOVIE_MATCHER_VERSION,
        matchEvaluatedAt: new Date(),
        matchEvaluation: {
          requestedTitle: "Existing Movie",
          normalizedTitle: "existing movie",
          threshold: 0.68,
          bestCandidate: null,
          acceptedCandidate: {
            tmdbMovieId: 67890,
            title: "Existing Movie",
            originalTitle: "Existing Movie",
            posterPath: "/old.jpg",
            releaseDate: "2003-01-01",
            popularity: 0,
            confidence: 0.8,
            sourceQuery: "Existing Movie",
          },
        },
      },
    ];

    const { resolveAndPersistCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog");

    await resolveAndPersistCatalog([
      {
        movies: [{ cinemaId: 10, name: "Existing Movie" }],
        showings: [
          {
            cinemaId: 10,
            movieName: "Existing Movie",
            dateTime: new Date("2026-06-01T18:00:00.000Z"),
            bookingUrl: null,
            showingAdditionalData: [],
          },
        ],
      },
    ]);

    expect(db.tmdbMetadata.findMany).toHaveBeenCalledWith({
      where: { tmdbId: { in: [67890] } },
      select: { tmdbId: true },
    });
    expect(upsertedMovies).toHaveLength(1);
    expect(upsertedMovies[0]).toMatchObject({
      canonicalKey: "tmdb:67890",
      tmdbMovieId: null,
    });
  });
  test("replaces only migrated cinemas and switches mappings in the same transaction", async () => {
    const { persistCinemaxxVueCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/persistCinemaxxVueCatalog");
    const result = await persistCinemaxxVueCatalog(
      [
        {
          movies: [{ cinemaId: 1490, name: "Direct Movie" }],
          showings: [
            {
              cinemaId: 1490,
              movieName: "Direct Movie",
              dateTime: new Date("2026-10-06T18:00:00Z"),
              bookingUrl:
                "https://www.cinemaxx.de/buchtickets/zusammenfassung/1931/film/1",
            },
          ],
        },
      ],
      [{ id: 1490, providerCinemaId: 1931 }],
    );
    expect(result.totalShowings).toBe(1);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.showing.createMany).not.toHaveBeenCalled();
    expect(replacementTransaction.showing.deleteMany).toHaveBeenCalledWith({
      where: { cinemaId: { in: [1490] } },
    });
    expect(replacementTransaction.cinema.update).toHaveBeenCalledWith({
      where: { id: 1490 },
      data: {
        kinoHeldCinemasMetadata: { disconnect: true },
        cinemaxxVueCinemasMetadata: {
          upsert: { create: { cinemaId: 1931 }, update: { cinemaId: 1931 } },
        },
        lastFetchedAt: expect.any(Date),
      },
    });
  });

  test("refuses empty direct catalogs before touching stored sources or showings", async () => {
    const { persistCinemaxxVueCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/persistCinemaxxVueCatalog");
    const calls = db.$transaction.mock.calls.length;
    await expect(
      persistCinemaxxVueCatalog(
        [{ movies: [], showings: [] }],
        [{ id: 1490, providerCinemaId: 1931 }],
      ),
    ).rejects.toThrow("empty");
    expect(db.$transaction.mock.calls.length).toBe(calls);
  });

  test("does not switch sources if inserting the replacement schedule fails", async () => {
    const { persistCinemaxxVueCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/persistCinemaxxVueCatalog");
    const updates = replacementTransaction.cinema.update.mock.calls.length;
    replacementTransaction.showing.createMany.mockImplementationOnce(() =>
      Promise.reject(new Error("insert failed")),
    );
    await expect(
      persistCinemaxxVueCatalog(
        [
          {
            movies: [{ cinemaId: 1490, name: "Film" }],
            showings: [
              {
                cinemaId: 1490,
                movieName: "Film",
                dateTime: new Date("2026-10-06T18:00:00Z"),
              },
            ],
          },
        ],
        [{ id: 1490, providerCinemaId: 1931 }],
      ),
    ).rejects.toThrow("insert failed");
    expect(replacementTransaction.cinema.update.mock.calls.length).toBe(
      updates,
    );
  });
});
