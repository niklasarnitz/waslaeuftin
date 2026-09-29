import { describe, expect, test } from "bun:test";

import {
  getScheduleDayQueryRange,
  getTimeZoneForCountry,
  localizeShowings,
} from "@waslaeuftin/api/internal/scheduleDay";

// Web URLs name a day ("2026-09-29" parsed at Berlin midnight), the apps send
// noon UTC of the day. Both must select the same day everywhere.
const webDate = new Date("2026-09-28T22:00:00.000Z");
const appDate = new Date("2026-09-29T12:00:00.000Z");

const showingAt = (iso: string) => ({ id: iso, dateTime: new Date(iso) });

describe("scheduleDay", () => {
  test("maps countries to their time zones", () => {
    expect(getTimeZoneForCountry("GERMANY")).toBe("Europe/Berlin");
    expect(getTimeZoneForCountry("AUSTRIA")).toBe("Europe/Vienna");
    expect(getTimeZoneForCountry("UNITED_KINGDOM")).toBe("Europe/London");
  });

  test("query range covers the day in Berlin and London", () => {
    for (const date of [webDate, appDate]) {
      expect(getScheduleDayQueryRange(date)).toEqual({
        // 00:00 in Berlin (CEST)
        gte: new Date("2026-09-28T22:00:00.000Z"),
        // 23:59:59.999 in London (BST)
        lte: new Date("2026-09-29T22:59:59.999Z"),
      });
    }
  });

  test("keeps showings on the day in the cinema's local time", () => {
    const showings = [
      // 23:30 in London, 00:30 the next day in Berlin
      showingAt("2026-09-29T22:30:00.000Z"),
      // 00:30 in Berlin, 23:30 the day before in London
      showingAt("2026-09-28T22:30:00.000Z"),
      // 19:00 in London, 20:00 in Berlin
      showingAt("2026-09-29T18:00:00.000Z"),
    ];

    for (const date of [webDate, appDate]) {
      expect(
        localizeShowings(showings, "UNITED_KINGDOM", { date }).map((s) => [
          s.id,
          s.timeZone,
        ]),
      ).toEqual([
        ["2026-09-29T22:30:00.000Z", "Europe/London"],
        ["2026-09-29T18:00:00.000Z", "Europe/London"],
      ]);

      expect(
        localizeShowings(showings, "GERMANY", { date }).map((s) => [
          s.id,
          s.timeZone,
        ]),
      ).toEqual([
        ["2026-09-28T22:30:00.000Z", "Europe/Berlin"],
        ["2026-09-29T18:00:00.000Z", "Europe/Berlin"],
      ]);
    }
  });

  test("only adds the time zone without a day", () => {
    expect(
      localizeShowings(
        [showingAt("2026-12-15T19:00:00.000Z")],
        "UNITED_KINGDOM",
      ),
    ).toEqual([
      {
        id: "2026-12-15T19:00:00.000Z",
        dateTime: new Date("2026-12-15T19:00:00.000Z"),
        timeZone: "Europe/London",
      },
    ]);
  });
});
