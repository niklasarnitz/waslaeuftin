import { describe, expect, it } from "bun:test";
import { groupMoviesByTitle } from "../../../src/components/movie-listing/groupMoviesByTitle";

describe("groupMoviesByTitle", () => {
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day in the future
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day in the past
  const farFutureDate = new Date(Date.now() + 1000 * 60 * 60 * 48); // 2 days in the future

  const mockCinema1 = {
    id: 1,
    name: "Cinema 1",
    slug: "cinema-1",
    href: "/cinema-1",
  };

  const mockCinema2 = {
    id: 2,
    name: "Cinema 2",
    slug: "cinema-2",
    href: "/cinema-2",
  };

  it("should group movies by title across different cinemas", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix.jpg",
            tmdbMetadata: { popularity: 100 },
            showings: [
              {
                id: 101,
                dateTime: futureDate,
                rawMovieName: "The Matrix",
              },
            ],
          },
        ],
      },
      {
        ...mockCinema2,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix2.jpg",
            tmdbMetadata: { popularity: 120 },
            showings: [
              {
                id: 102,
                dateTime: farFutureDate,
                rawMovieName: "The Matrix (Dubbed)",
              },
            ],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("The Matrix");
    expect(result[0].showingsCount).toBe(2);
    expect(result[0].cinemaEntries).toHaveLength(2);
    expect(result[0].tmdbPopularity).toBe(120);
  });

  it("should filter out past showings", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix.jpg",
            showings: [
              {
                id: 101,
                dateTime: pastDate,
                rawMovieName: "The Matrix",
              },
              {
                id: 102,
                dateTime: futureDate,
                rawMovieName: "The Matrix",
              },
            ],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(1);
    expect(result[0].showingsCount).toBe(1);
    expect(result[0].cinemaEntries[0].showings).toHaveLength(1);
    expect(result[0].cinemaEntries[0].showings[0].id).toBe(102);
  });

  it("should ignore movies with only past showings", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "Past Movie",
            coverUrl: "past.jpg",
            showings: [
              {
                id: 101,
                dateTime: pastDate,
                rawMovieName: "Past Movie",
              },
            ],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(0);
  });

  it("should sort movies by name by default", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "Zebra",
            coverUrl: "zebra.jpg",
            showings: [{ id: 1, dateTime: futureDate, rawMovieName: "Zebra" }],
          },
          {
            name: "Apple",
            coverUrl: "apple.jpg",
            showings: [{ id: 2, dateTime: futureDate, rawMovieName: "Apple" }],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Apple");
    expect(result[1].name).toBe("Zebra");
  });

  it("should sort movies by popularity when specified", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "Zebra",
            coverUrl: "zebra.jpg",
            tmdbMetadata: { popularity: 100 },
            showings: [{ id: 1, dateTime: futureDate, rawMovieName: "Zebra" }],
          },
          {
            name: "Apple",
            coverUrl: "apple.jpg",
            tmdbMetadata: { popularity: 50 },
            showings: [{ id: 2, dateTime: futureDate, rawMovieName: "Apple" }],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas, { sortBy: "popularity" });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Zebra");
    expect(result[1].name).toBe("Apple");
  });

  it("should limit the number of results when limit is provided", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "Movie 1",
            coverUrl: "1.jpg",
            showings: [{ id: 1, dateTime: futureDate, rawMovieName: "Movie 1" }],
          },
          {
            name: "Movie 2",
            coverUrl: "2.jpg",
            showings: [{ id: 2, dateTime: futureDate, rawMovieName: "Movie 2" }],
          },
          {
            name: "Movie 3",
            coverUrl: "3.jpg",
            showings: [{ id: 3, dateTime: futureDate, rawMovieName: "Movie 3" }],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas, { limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Movie 1");
    expect(result[1].name).toBe("Movie 2");
  });

  it("should select the correct nextShowing across all cinemas", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix.jpg",
            showings: [
              {
                id: 1,
                dateTime: farFutureDate,
                rawMovieName: "The Matrix",
              },
            ],
          },
        ],
      },
      {
        ...mockCinema2,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix2.jpg",
            showings: [
              {
                id: 2,
                dateTime: futureDate, // This one is sooner
                rawMovieName: "The Matrix",
              },
            ],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(1);
    expect(result[0].nextShowing?.id).toBe(2);
  });

  it("should update coverUrl if the first cinema doesn't have it but subsequent one does", () => {
    const cinemas = [
      {
        ...mockCinema1,
        movies: [
          {
            name: "The Matrix",
            coverUrl: null,
            showings: [{ id: 1, dateTime: futureDate, rawMovieName: "The Matrix" }],
          },
        ],
      },
      {
        ...mockCinema2,
        movies: [
          {
            name: "The Matrix",
            coverUrl: "matrix-found.jpg",
            showings: [{ id: 2, dateTime: farFutureDate, rawMovieName: "The Matrix" }],
          },
        ],
      },
    ];

    const result = groupMoviesByTitle(cinemas);

    expect(result).toHaveLength(1);
    expect(result[0].coverUrl).toBe("matrix-found.jpg");
  });
});
