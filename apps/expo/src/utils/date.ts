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
