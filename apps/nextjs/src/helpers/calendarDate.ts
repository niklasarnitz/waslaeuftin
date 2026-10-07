import { createScheduleDate } from "@waslaeuftin/core";

// Calendar dates are wall dates in the picker, not UTC instants.
export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!, 12);
  return serializeCalendarDate(date) === value ? date : null;
}

export function serializeCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function scheduleCalendarDate(offset = 0, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(createScheduleDate(offset, now));
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return parseCalendarDate(`${values.year}-${values.month}-${values.day}`)!;
}
