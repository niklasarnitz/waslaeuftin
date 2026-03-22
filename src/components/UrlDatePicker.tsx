"use client";

import { DatePicker } from "@waslaeuftin/components/ui/date-picker";
import moment from "moment-timezone";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

export const UrlDatePicker = (
  props: { citySlug: string } | { cinemaSlug: string },
) => {
  const citySlug = "citySlug" in props ? props.citySlug : undefined;
  const cinemaSlug = "cinemaSlug" in props ? props.cinemaSlug : undefined;

  const router = useRouter();

  const [date, setDate] = useQueryState("date", {
    parse: (query) => moment(query).toDate(),
    serialize: (date) => moment(date).format("YYYY-MM-DD"),
    shallow: false,
  });

  const updateDate = useCallback(
    async (date: Date | undefined) => {
      if (moment(date).isSame(moment(), "day")) {
        router.push(
          `/${citySlug ? "city" : "cinema"}/${citySlug ?? cinemaSlug}/`,
        );
      } else {
        await setDate(date ?? null);
      }
    },
    [cinemaSlug, citySlug, router, setDate],
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
      isActive: Boolean(date) && moment(date).isSame(moment().add(1, "day"), "day"),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <div className="inline-flex w-full gap-1 rounded-lg border border-border/80 bg-muted/50 p-1 sm:w-auto">
        {quickDateButtons.map((button) => (
          <button
            key={button.label}
            type="button"
            onClick={() => {
              void updateDate(button.value);
            }}
            className={`h-8 flex-1 rounded-md px-3 text-xs font-semibold transition-colors sm:flex-none ${
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
