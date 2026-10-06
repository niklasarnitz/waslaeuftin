import { afterEach, describe, expect, mock, test } from "bun:test";

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
let acceptedCandidate: {
  tmdbMovieId: number;
  title: string;
  posterPath: string | null;
  confidence: number;
} | null = null;
let fetchTmdbMovieDetailsError: Error | null = null;

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
  },
}));
mock.module("@waslaeuftin/helpers/fileStorage/createS3Client", () => ({
  createS3Client: mock(() => ({})),
}));
mock.module("@waslaeuftin/helpers/fileStorage/assertBucketAccessible", () => ({
  assertBucketAccessible: mock(async () => undefined),
}));
mock.module("@waslaeuftin/helpers/tmdb/TmdbMovieMatcher", () => ({
  TmdbMovieMatcher: class MockTmdbMovieMatcher {
    async evaluate() {
      return { acceptedCandidate };
    }
  },
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
  afterEach(() => {
    upsertedMovies.length = 0;
    createdShowings.length = 0;
    existingMovies = [];
    storedTmdbMetadataIds = new Set<number>();
    acceptedCandidate = null;
    fetchTmdbMovieDetailsError = null;
    db.movie.findMany.mockClear();
    db.movie.upsert.mockClear();
    db.tmdbMetadata.findMany.mockClear();
    db.showing.createMany.mockClear();
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
