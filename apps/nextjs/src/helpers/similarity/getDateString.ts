import { createScheduleDate, isSameScheduleDay } from "@waslaeuftin/core";

export const getDateString = (date?: string) => {
  if (!date) return "in nächster Zeit";
  const selected = new Date(date);
  if (Number.isNaN(selected.getTime())) return "in nächster Zeit";
  const now = new Date();
  if (isSameScheduleDay(now, selected)) return "heute";
  if (isSameScheduleDay(createScheduleDate(1, now), selected)) return "morgen";
  return `am ${new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(selected)}`;
};
