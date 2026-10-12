import { describe, expect, mock, test } from "bun:test";

import {
  getScheduleDayRange,
  getScheduleDayShowingFilter,
  getScheduleTimeZone,
  withScheduleTimeZone,
} from "@waslaeuftin/api/internal/scheduleDay";

// Web URLs name a day ("2026-09-29" parsed at Berlin midnight), the apps send
// noon UTC of the day. Both must select the same day everywhere.
const webDate = new Date("2026-09-28T22:00:00.000Z");
const appDate = new Date("2026-09-29T12:00:00.000Z");

describe("scheduleDay", () => {
  test("the no-date cinema API returns all upcoming listed slots, not retained history", async () => {
    const now = Date.now();
    const fixtures = [
      { id: 1, dateTime: new Date("2000-01-01"), isListed: true },
      { id: 2, dateTime: new Date(now + 3_600_000), isListed: true },
      { id: 3, dateTime: new Date(now + 3_600_000), isListed: false },
      { id: 4, dateTime: new Date(now + 30 * 86_400_000), isListed: true },
    ];
    await mock.module("@waslaeuftin/db/client", () => ({
      db: {
        cinema: {
          findFirst: (params: {
            include: {
              showings: {
                where: {
                  isListed?: boolean;
                  dateTime?: { gte: Date };
                  OR?: { dateTime: { gte: Date; lte: Date } }[];
                };
              };
            };
          }) => {
            const where = params.include.showings.where;
            return Promise.resolve({
              id: 10,
              name: "Fixture Cinema",
              slug: "fixture",
              country: "GERMANY",
              city: { name: "Fixture City", slug: "fixture-city" },
              showings: fixtures
                .filter(
                  (row) =>
                    (where.isListed === undefined ||
                      row.isListed === where.isListed) &&
                    (!where.dateTime || row.dateTime >= where.dateTime.gte) &&
                    (!where.OR ||
                      where.OR.some(
                        (clause) =>
                          row.dateTime >= clause.dateTime.gte &&
                          row.dateTime <= clause.dateTime.lte,
                      )),
                )
                .map((row) => ({
                  ...row,
                  movie: {
                    id: 99,
                    name: "Fixture Film",
                    coverUrl: null,
                    tmdbMetadata: null,
                  },
                })),
            });
          },
        },
      },
    }));
    await mock.module("@waslaeuftin/api/internal/umami", () => ({
      getAnalyticsSource: () => "web",
      trackCinemaView: () => Promise.resolve(undefined),
    }));
    const { db } = await import("@waslaeuftin/db/client");
    const { cinemaRouter } =
      await import("@waslaeuftin/api/internal/router/cinema");
    const caller = cinemaRouter.createCaller({ db, headers: new Headers() });
    const result = await caller.getCinemaBySlug({ cinemaSlug: "fixture" });
    expect(
      result?.movies.flatMap((movie) => movie.showings.map((row) => row.id)),
    ).toEqual([2, 4]);
  });

  test("only selects listed showings for explicit days and today's programme", () => {
    for (const date of [webDate, appDate, undefined]) {
      const filter = getScheduleDayShowingFilter(date);
      expect(filter.isListed).toBe(true);
      expect(filter.OR).toBeDefined();
    }
  });

  test("maps countries to their time zones", () => {
    expect(getScheduleTimeZone("GERMANY")).toBe("Europe/Berlin");
    expect(getScheduleTimeZone("AUSTRIA")).toBe("Europe/Berlin");
  });

  test("selects the day in the cinema's local time", () => {
    for (const date of [webDate, appDate]) {
      expect(getScheduleDayRange(date, "Europe/Berlin")).toEqual({
        gte: new Date("2026-09-28T22:00:00.000Z"),
        lte: new Date("2026-09-29T21:59:59.999Z"),
      });
      expect(getScheduleDayRange(date, "Europe/London")).toEqual({
        gte: new Date("2026-09-28T23:00:00.000Z"),
        lte: new Date("2026-09-29T22:59:59.999Z"),
      });
    }
  });

  test("adds the cinema's time zone to its showings", () => {
    const dateTime = new Date("2026-12-15T19:00:00.000Z");

    expect(withScheduleTimeZone([{ id: 1, dateTime }], "GERMANY")).toEqual([
      { id: 1, dateTime, timeZone: "Europe/Berlin" },
    ]);
  });
});
