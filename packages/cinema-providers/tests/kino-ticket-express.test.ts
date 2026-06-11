import { expect, test } from "bun:test";

import {
  getKinoTicketsExpressMovies,
  parseKinoTicketsExpressDateTime,
} from "@waslaeuftin/cinema-providers/server";

const testCinema = async (slug: string) => {
  const { movies, showings } = await getKinoTicketsExpressMovies(-1, slug);

  console.info(
    `Got ${movies.length} movies with ${showings.length} showings for ${slug}`,
  );

  expect(movies.length).toBeGreaterThan(0);
  expect(showings.length).toBeGreaterThan(0);
};

const testCinemaBookingUrls = async (slug: string) => {
  const { showings } = await getKinoTicketsExpressMovies(-1, slug);

  expect(showings.length).toBeGreaterThan(0);

  for (const showing of showings) {
    expect(showing.bookingUrl).toBeTruthy();
    expect(showing.bookingUrl).not.toContain("undefined");
    expect(showing.bookingUrl).not.toContain("null");

    const url = new URL(showing.bookingUrl);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("kinotickets.express");
    expect(url.pathname.startsWith(`/${slug}/booking/`)).toBe(true);
  }
};

test(
  "kino tickets express: Schauburg Karlsruhe",
  async () => {
    await testCinema("karlsruhe_schauburg");
  },
  { timeout: 20000 },
);

test(
  "kino tickets express: Schauburg Karlsruhe booking URLs",
  async () => {
    await testCinemaBookingUrls("karlsruhe_schauburg");
  },
  { timeout: 20000 },
);

test(
  "kino tickets express: Kinemathek Karlsruhe",
  async () => {
    await testCinema("karlsruhe_kinemathek");
  },
  { timeout: 20000 },
);

test("kino tickets express: parses provider-local times in Europe/Berlin", () => {
  const parsed = parseKinoTicketsExpressDateTime(
    "2026-04-18 19:00",
    "YYYY-MM-DD HH:mm",
  );

  expect(parsed.toISOString()).toBe("2026-04-18T17:00:00.000Z");
});
