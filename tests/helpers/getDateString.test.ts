import { expect, test, describe } from "bun:test";
import moment from "moment-timezone";
import { getDateString } from "../../src/helpers/getDateString";

describe("getDateString", () => {
  test("returns 'in nächster Zeit' when no date is provided", () => {
    expect(getDateString()).toBe("in nächster Zeit");
  });

  test("returns 'heute' when the date is today", () => {
    const today = moment().toISOString();
    expect(getDateString(today)).toBe("heute");
  });

  test("returns 'morgen' when the date is tomorrow", () => {
    const tomorrow = moment().add(1, "days").toISOString();
    expect(getDateString(tomorrow)).toBe("morgen");
  });

  test("returns formatted date when the date is in the future (not tomorrow)", () => {
    const nextWeek = moment().add(7, "days");
    const formattedDate = nextWeek.format("DD.MM.YYYY");
    expect(getDateString(nextWeek.toISOString())).toBe(`am ${formattedDate}`);
  });

  test("returns formatted date when the date is in the past", () => {
    const yesterday = moment().subtract(1, "days");
    const formattedDate = yesterday.format("DD.MM.YYYY");
    expect(getDateString(yesterday.toISOString())).toBe(`am ${formattedDate}`);
  });
});
