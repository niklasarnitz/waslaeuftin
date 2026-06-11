"use client";

import { useCallback } from "react";
import moment from "moment-timezone";
import { useQueryState } from "nuqs";

import { DatePicker } from "@waslaeuftin/components/ui/date-picker";

export const UrlDatePicker = (
  props: { citySlug: string } | { cinemaSlug: string },
) => {
  void props;

  const [date, setDate] = useQueryState("date", {
    parse: (query) => moment(query).toDate(),
    serialize: (date) => moment(date).format("YYYY-MM-DD"),
    shallow: false,
  });

  const updateDate = useCallback(
    async (date: Date | undefined) => {
      if (moment(date).isSame(moment(), "day")) {
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
      value: moment().toDate(),
      isActive: !date || moment(date).isSame(moment(), "day"),
    },
    {
      label: "Morgen",
      value: moment().add(1, "day").toDate(),
      isActive:
        Boolean(date) && moment(date).isSame(moment().add(1, "day"), "day"),
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
      <DatePicker value={date ?? moment().toDate()} onChange={updateDate} />
    </div>
  );
};
