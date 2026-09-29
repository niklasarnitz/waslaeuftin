import { describe, expect, test } from "bun:test";

import {
  getScheduleDayRange,
  getScheduleTimeZone,
  withScheduleTimeZone,
} from "@waslaeuftin/api/internal/scheduleDay";

// Web URLs name a day ("2026-09-29" parsed at Berlin midnight), the apps send
// noon UTC of the day. Both must select the same day everywhere.
const webDate = new Date("2026-09-28T22:00:00.000Z");
const appDate = new Date("2026-09-29T12:00:00.000Z");

describe("scheduleDay", () => {
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
