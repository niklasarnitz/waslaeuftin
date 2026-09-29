export const SCHEDULE_TIME_ZONE = "Europe/Berlin";

const getScheduleDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: SCHEDULE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

export function createScheduleDate(dayOffset = 0, from = new Date()): Date {
  const { year, month, day } = getScheduleDateParts(from);

  // Use noon UTC as a stable instant that still falls on the intended Berlin
  // calendar day, avoiding local-midnight timezone shifts in serialized queries.
  return new Date(Date.UTC(year, month - 1, day + dayOffset, 12));
}

export function isSameScheduleDay(left: Date, right: Date): boolean {
  const leftParts = getScheduleDateParts(left);
  const rightParts = getScheduleDateParts(right);

  return (
    leftParts.day === rightParts.day &&
    leftParts.month === rightParts.month &&
    leftParts.year === rightParts.year
  );
}

/**
 * Normalizes a date to a stable instant on its Europe/Berlin calendar day.
 * This ensures that queries sent to tRPC on the same day share the exact same Date representation
 * in their query keys, guaranteeing cache hits.
 */
export function normalizeToStartOfDay(date: Date): Date {
  return createScheduleDate(0, date);
}

const zonedPartsFormatters = new Map<string, Intl.DateTimeFormat>();

const getZonedParts = (date: Date, timeZone: string) => {
  let formatter = zonedPartsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    zonedPartsFormatters.set(timeZone, formatter);
  }

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
};

const toDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

/**
 * Hour (0-23) of a showing in its cinema's time zone. Showings are stored as
 * absolute instants; the API adds the cinema's `timeZone` to each one.
 */
export function getHoursInTimeZone(
  dateTime: Date | string,
  timeZone: string = SCHEDULE_TIME_ZONE,
): number {
  return getZonedParts(toDate(dateTime), timeZone).hour;
}

/** "HH:mm" in the given time zone (the cinema's, not the viewer's). */
export function formatTime(
  dateTimeStr: Date | string,
  timeZone: string = SCHEDULE_TIME_ZONE,
): string {
  const d = toDate(dateTimeStr);
  if (isNaN(d.getTime())) return "??:??";
  const { hour, minute } = getZonedParts(d, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * "HH:mm" for showings today, otherwise "DD.MM. HH:mm", both in the given time
 * zone (the cinema's, not the viewer's).
 */
export function formatShowingTime(
  dateTimeStr: Date | string,
  timeZone: string = SCHEDULE_TIME_ZONE,
): string {
  const d = toDate(dateTimeStr);
  if (isNaN(d.getTime())) return "??:??";

  const showing = getZonedParts(d, timeZone);
  const now = getZonedParts(new Date(), timeZone);
  const isToday =
    showing.day === now.day &&
    showing.month === now.month &&
    showing.year === now.year;

  const time = formatTime(d, timeZone);

  if (isToday) {
    return time;
  }

  const day = String(showing.day).padStart(2, "0");
  const month = String(showing.month).padStart(2, "0");
  return `${day}.${month}. ${time}`;
}

export function formatDistance(
  distanceKm: number | null | undefined,
): string | null {
  if (distanceKm === null || distanceKm === undefined) return null;
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
