"use client";

import { useCallback } from "react";
import { useQueryState } from "nuqs";

import { DatePicker } from "@waslaeuftin/components/ui/date-picker";
import {
  parseCalendarDate,
  scheduleCalendarDate,
  serializeCalendarDate,
} from "@waslaeuftin/helpers/calendarDate";

export const UrlDatePicker = (
  props: { citySlug: string } | { cinemaSlug: string },
) => {
  void props;

  const [date, setDate] = useQueryState("date", {
    parse: parseCalendarDate,
    serialize: serializeCalendarDate,
    shallow: false,
  });

  const updateDate = useCallback(
    async (date: Date | undefined) => {
      if (
        !date ||
        serializeCalendarDate(date) ===
          serializeCalendarDate(scheduleCalendarDate())
      ) {
        await setDate(null);
      } else {
        await setDate(date ?? null);
      }
    },
    [setDate],
  );

  const quickDateButtons = [
    {
      label: "Heute",
      value: scheduleCalendarDate(),
      isActive:
        !date ||
        serializeCalendarDate(date) ===
          serializeCalendarDate(scheduleCalendarDate()),
    },
    {
      label: "Morgen",
      value: scheduleCalendarDate(1),
      isActive:
        Boolean(date) &&
        serializeCalendarDate(date!) ===
          serializeCalendarDate(scheduleCalendarDate(1)),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <div className="border-border/80 bg-muted/50 inline-flex w-full gap-1 rounded-lg border p-1 sm:w-auto">
        {quickDateButtons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={() => {
              void updateDate(button.value);
            }}
            aria-pressed={button.isActive}
            className={`focus-visible:ring-ring h-8 flex-1 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:flex-none ${
              button.isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background"
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
      <DatePicker
        value={date ?? scheduleCalendarDate()}
        onChange={updateDate}
      />
    </div>
  );
};
