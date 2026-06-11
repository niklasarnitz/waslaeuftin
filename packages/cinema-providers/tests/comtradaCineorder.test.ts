import { expect, test } from "bun:test";

import { getComtradaCineOrderMovies } from "@waslaeuftin/cinema-providers/server";

const filmpalastAmZkmMetadata = {
  backendUrl: "https://iframe.cineorder.filmpalast.net",
  centerShorty: "zkm",
  centerId: "6F000000014BHGWDVI",
  createdAt: new Date(),
  updatedAt: new Date(),
  id: -2,
};

const forumRastattMetadata = {
  backendUrl: "https://cineorder.forumcinemas.de",
  centerShorty: "fra",
  centerId: "90000000014EXQRDFE",
  createdAt: new Date(),
  updatedAt: new Date(),
  id: -2,
};

const skipComtradaAntiBotError = (error: unknown) => {
  if (
    error instanceof Error &&
    (error.message.includes("404") ||
      error.message.includes("Forbidden") ||
      error.message.includes("Automated access detected"))
  ) {
    console.warn(
      `Skipping comtrada cineorder test due to external API anti-bot protection: ${error.message}`,
    );
    return;
  }

  throw error;
};

const expectComtradaBookingUrls = (
  showings: Awaited<ReturnType<typeof getComtradaCineOrderMovies>>["showings"],
  expected: { backendUrl: string; centerShorty: string },
) => {
  expect(showings.length).toBeGreaterThan(0);

  for (const showing of showings) {
    expect(showing.bookingUrl).toBeTruthy();
    expect(showing.bookingUrl).not.toContain("undefined");
    expect(showing.bookingUrl).not.toContain("null");

    const url = new URL(showing.bookingUrl);
    const backendUrl = new URL(expected.backendUrl);

    expect(url.protocol).toBe("https:");
    expect(url.origin).toBe(backendUrl.origin);
    expect(url.pathname.startsWith(`/${expected.centerShorty}/movie/`)).toBe(
      true,
    );
    expect(url.pathname).toContain("/performance/");
  }
};

test(
  "comtrada cineorder: Filmpalast am ZKM",
  async () => {
    try {
      const { movies, showings } = await getComtradaCineOrderMovies(
        -1,
        filmpalastAmZkmMetadata,
      );

      console.info(
        `Got ${movies.length} movies with ${showings.length} showings for Filmpalast am ZKM`,
      );

      expect(movies.length).toBeGreaterThan(0);
      expect(showings.length).toBeGreaterThan(0);
    } catch (error) {
      skipComtradaAntiBotError(error);
    }
  },
  { timeout: 40000 },
);

test(
  "comtrada cineorder: Filmpalast am ZKM booking URLs",
  async () => {
    try {
      const { showings } = await getComtradaCineOrderMovies(
        -1,
        filmpalastAmZkmMetadata,
      );

      expectComtradaBookingUrls(showings, filmpalastAmZkmMetadata);
    } catch (error) {
      skipComtradaAntiBotError(error);
    }
  },
  { timeout: 40000 },
);

test(
  "comtrada cineorder: Forum Rastatt",
  async () => {
    try {
      const { movies, showings } = await getComtradaCineOrderMovies(
        -1,
        forumRastattMetadata,
      );

      console.info(
        `Got ${movies.length} movies with ${showings.length} showings for Forum Rastatt`,
      );

      expect(movies.length).toBeGreaterThan(0);
      expect(showings.length).toBeGreaterThan(0);
    } catch (error) {
      skipComtradaAntiBotError(error);
    }
  },
  { timeout: 20000 },
);

test(
  "comtrada cineorder: Forum Rastatt booking URLs",
  async () => {
    try {
      const { showings } = await getComtradaCineOrderMovies(
        -1,
        forumRastattMetadata,
      );

      expectComtradaBookingUrls(showings, forumRastattMetadata);
    } catch (error) {
      skipComtradaAntiBotError(error);
    }
  },
  { timeout: 20000 },
);
