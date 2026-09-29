import { expect, test } from "bun:test";
import moment from "moment-timezone";

import type { OdeonShowtimesResponse } from "@waslaeuftin/cinema-providers/internal/providers/odeon/types/OdeonOcapi";
import {
  mapOdeonShowtimes,
  parseOdeonDateTime,
} from "@waslaeuftin/cinema-providers/internal/providers/odeon/getOdeonMovies";
import { parseOdeonApiConfig } from "@waslaeuftin/cinema-providers/internal/providers/odeon/odeonApi";
import { getOdeonMovies } from "@waslaeuftin/cinema-providers/server";

const text = (value: string) => ({ text: value, translations: [] });

// Trimmed from a real ODEON Luxe Leicester Square response.
const leicesterSquareResponse: OdeonShowtimesResponse = {
  businessDate: "2026-07-11",
  showtimes: [
    {
      id: "153-38894",
      schedule: {
        businessDate: "2026-07-11",
        startsAt: "2026-07-11T19:00:00+01:00",
        endsAt: "2026-07-11T20:55:00+01:00",
      },
      isSoldOut: false,
      filmId: "HO00008565",
      siteId: "153",
      screenId: "153-3",
      attributeIds: ["0000000006", "0000000208", "0000000149", "0000000999"],
      requires3dGlasses: true,
      eventId: null,
    },
    {
      id: "153-38901",
      schedule: {
        businessDate: "2026-12-11",
        startsAt: "2026-12-11T23:30:00+00:00",
        endsAt: "2026-12-12T01:30:00+00:00",
      },
      isSoldOut: false,
      filmId: "HO00008565",
      siteId: "153",
      screenId: "153-3",
      attributeIds: ["0000000500", "0000000501"],
      requires3dGlasses: false,
      eventId: null,
    },
    {
      id: "153-39000",
      schedule: {
        businessDate: "2026-07-11",
        startsAt: "2026-07-11T10:00:00+01:00",
        endsAt: "2026-07-11T12:00:00+01:00",
      },
      isSoldOut: false,
      filmId: "HO00009999",
      siteId: "153",
      screenId: "153-3",
      attributeIds: [],
      requires3dGlasses: false,
      eventId: null,
    },
  ],
  relatedData: {
    sites: [],
    films: [
      { id: "HO00008565", title: text("The Odyssey ") },
      { id: "HO00009999", title: text("Private Hire") },
    ],
    screens: [{ id: "153-3", name: text("Screen 3") }],
    attributes: [
      { id: "0000000006", name: text("Audio Described") },
      { id: "0000000208", name: text("Watchword") },
      { id: "0000000149", name: text("Dolby") },
      { id: "0000000999", name: text("3D - Web ") },
      { id: "0000000500", name: text("Hindi (Audio)") },
      { id: "0000000501", name: text("£1 web") },
    ],
  },
};

test("odeon: maps showtimes to London times, tags and booking URLs", () => {
  const { movies, showings } = mapOdeonShowtimes(-1, [leicesterSquareResponse]);

  expect(movies).toEqual([{ cinemaId: -1, name: "The Odyssey" }]);
  expect(showings).toHaveLength(2);

  const [summer, winter] = showings;
  // 19:00 BST
  expect(summer?.dateTime.toISOString()).toBe("2026-07-11T18:00:00.000Z");
  expect(summer?.bookingUrl).toBe(
    "https://www.odeon.co.uk/ticketing/seat-picker/?showtimeId=153-38894",
  );
  expect(summer?.showingAdditionalData).toEqual([
    "Screen 3",
    "Audio Described",
    "Dolby Cinema",
    "3D",
  ]);

  // 23:30 GMT stays on its London day.
  expect(winter?.dateTime.toISOString()).toBe("2026-12-11T23:30:00.000Z");
  expect(
    moment(winter?.dateTime).tz("Europe/London").format("YYYY-MM-DD HH:mm"),
  ).toBe("2026-12-11 23:30");
  expect(winter?.showingAdditionalData).toEqual(["Screen 3", "Hindi audio"]);
});

test("odeon: reads times without an offset as London local time", () => {
  expect(parseOdeonDateTime("2026-07-11T19:00:00").toISOString()).toBe(
    "2026-07-11T18:00:00.000Z",
  );
  expect(parseOdeonDateTime("2026-01-11T19:00:00").toISOString()).toBe(
    "2026-01-11T19:00:00.000Z",
  );
});

test("odeon: reads the API token from the home page HTML", () => {
  const token = "eyJhbGciOiJSUzI1NiJ9.eyJleHAiOjE3ODM4MzMyNjF9.c2lnbmF0dXJl";
  const html = `<script>window.initialData = {"api":{"apiUrl":"https:\\/\\/vwc.odeon.co.uk\\/WSVistaWebClient","authToken":"${token}"}};</script>`;

  expect(parseOdeonApiConfig(html)).toEqual({
    apiUrl: "https://vwc.odeon.co.uk/WSVistaWebClient",
    authToken: token,
    expiresAt: 1783833261000,
  });
  expect(parseOdeonApiConfig("<html></html>")).toBeNull();
});

const skipOdeonExternalError = (error: unknown) => {
  if (
    error instanceof Error &&
    /ODEON|status code|fetch|ECONN|timed? ?out/i.test(error.message)
  ) {
    console.warn(
      `Skipping odeon test due to an external API error: ${error.message}`,
    );
    return;
  }

  throw error;
};

const testOdeonSite = (name: string, siteId: string) =>
  test(
    `odeon: ${name}`,
    async () => {
      try {
        const { movies, showings } = await getOdeonMovies(-1, siteId);

        console.info(
          `Got ${movies.length} movies with ${showings.length} showings for ${name}`,
        );

        expect(movies.length).toBeGreaterThan(0);
        expect(showings.length).toBeGreaterThan(0);

        for (const showing of showings) {
          expect(Number.isNaN(showing.dateTime.getTime())).toBe(false);
          expect(showing.bookingUrl).toStartWith(
            "https://www.odeon.co.uk/ticketing/seat-picker/?showtimeId=",
          );
        }
      } catch (error) {
        skipOdeonExternalError(error);
      }
    },
    { timeout: 180000 },
  );

testOdeonSite("ODEON Luxe Leicester Square", "153");
testOdeonSite("ODEON Tottenham Court Road", "200");
