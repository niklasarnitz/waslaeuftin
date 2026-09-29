import moment from "moment-timezone";

import type { Prisma } from "@waslaeuftin/db";
import { Countries } from "@waslaeuftin/db";

// Clients send schedule dates as an instant on the intended Europe/Berlin
// calendar day (noon UTC, see createScheduleDate in @waslaeuftin/core).
const CLIENT_SCHEDULE_TIME_ZONE = "Europe/Berlin";

const DEFAULT_SCHEDULE_TIME_ZONE = "Europe/Berlin";

// Countries whose cinemas don't run on Berlin time.
const SCHEDULE_TIME_ZONE_BY_COUNTRY: Partial<Record<Countries, string>> = {
  [Countries.UNITED_KINGDOM]: "Europe/London",
};

const OTHER_TIME_ZONE_COUNTRIES = Object.keys(
  SCHEDULE_TIME_ZONE_BY_COUNTRY,
) as Countries[];

export const getScheduleTimeZone = (country: Countries) =>
  SCHEDULE_TIME_ZONE_BY_COUNTRY[country] ?? DEFAULT_SCHEDULE_TIME_ZONE;

/**
 * Start and end of the schedule day `date` in `timeZone`: the same calendar
 * day, bounded by the cinema's local midnight. Without a date, today in
 * `timeZone`.
 */
export const getScheduleDayRange = (
  date: Date | undefined,
  timeZone: string,
) => {
  const day = date
    ? moment.tz(
        moment(date).tz(CLIENT_SCHEDULE_TIME_ZONE).format("YYYY-MM-DD"),
        timeZone,
      )
    : moment.tz(timeZone);

  return {
    gte: day.clone().startOf("day").toDate(),
    lte: day.clone().endOf("day").toDate(),
  };
};

/**
 * Showings on the schedule day `date`, where each showing's day is bounded by
 * its cinema's local midnight (so a 23:30 showing in London stays on its day).
 */
export const getScheduleDayShowingFilter = (
  date: Date | undefined,
): Prisma.ShowingWhereInput => ({
  OR: [
    {
      cinema: { country: { notIn: OTHER_TIME_ZONE_COUNTRIES } },
      dateTime: getScheduleDayRange(date, DEFAULT_SCHEDULE_TIME_ZONE),
    },
    ...OTHER_TIME_ZONE_COUNTRIES.map((country) => ({
      cinema: { country },
      dateTime: getScheduleDayRange(date, getScheduleTimeZone(country)),
    })),
  ],
});

/**
 * Adds the cinema's time zone to its showings. Showings are stored as
 * instants; clients format them in this zone, so a cinema shows its local
 * time wherever the viewer is.
 */
export const withScheduleTimeZone = <T extends object>(
  showings: T[],
  country: Countries,
): (T & { timeZone: string })[] => {
  const timeZone = getScheduleTimeZone(country);
  return showings.map((showing) => ({ ...showing, timeZone }));
};
