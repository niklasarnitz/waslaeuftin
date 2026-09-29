import moment from "moment-timezone";

import type { Countries } from "@waslaeuftin/db";

// Showings are stored as absolute instants. Everything the user sees -- the
// time of a showing and which day it belongs to -- is in the cinema's local
// time, whoever is looking.

/** Zone the clients' date parameters are encoded in (see core `createScheduleDate`). */
const REQUEST_TIME_ZONE = "Europe/Berlin";

const COUNTRY_TIME_ZONES: Record<Countries, string> = {
  GERMANY: "Europe/Berlin",
  AUSTRIA: "Europe/Vienna",
  UNITED_KINGDOM: "Europe/London",
};

const ALL_TIME_ZONES = Array.from(new Set(Object.values(COUNTRY_TIME_ZONES)));

export const getTimeZoneForCountry = (country: Countries) =>
  COUNTRY_TIME_ZONES[country];

/**
 * The requested calendar day in `timeZone`. A given date names a calendar day
 * (the web sends midnight, the apps noon UTC; both fall on the intended day in
 * Berlin); without one it is today where the cinema is.
 */
const getScheduleDayRange = (date: Date | undefined, timeZone: string) => {
  const day = date
    ? moment(date).tz(REQUEST_TIME_ZONE).format("YYYY-MM-DD")
    : moment.tz(timeZone).format("YYYY-MM-DD");
  const start = moment.tz(day, "YYYY-MM-DD", timeZone).startOf("day");

  return { start: start.toDate(), end: start.clone().endOf("day").toDate() };
};

/**
 * Range covering the requested day in every supported time zone, for queries
 * across cinemas. Narrow the result per cinema with `localizeShowings`.
 */
export const getScheduleDayQueryRange = (date: Date | undefined) => {
  const ranges = ALL_TIME_ZONES.map((timeZone) =>
    getScheduleDayRange(date, timeZone),
  );

  return {
    gte: new Date(Math.min(...ranges.map((r) => r.start.getTime()))),
    lte: new Date(Math.max(...ranges.map((r) => r.end.getTime()))),
  };
};

/**
 * Adds the cinema's time zone to its showings so clients can show them in
 * local time. With `day`, also drops showings outside that day in the
 * cinema's time zone (`day.date` undefined meaning today).
 */
export const localizeShowings = <T extends { dateTime: Date }>(
  showings: T[],
  country: Countries,
  day?: { date: Date | undefined },
): (T & { timeZone: string })[] => {
  const timeZone = getTimeZoneForCountry(country);
  const range = day ? getScheduleDayRange(day.date, timeZone) : undefined;

  const localized: (T & { timeZone: string })[] = [];
  for (const showing of showings) {
    if (
      range &&
      (showing.dateTime < range.start || showing.dateTime > range.end)
    ) {
      continue;
    }
    localized.push({ ...showing, timeZone });
  }

  return localized;
};
