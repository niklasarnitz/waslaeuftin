"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

import { Button } from "@waslaeuftin/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@waslaeuftin/components/ui/popover";
import {
  scheduleCalendarDate,
  serializeCalendarDate,
} from "@waslaeuftin/helpers/calendarDate";
import { cn } from "@waslaeuftin/lib/utils";

const Calendar = dynamic(
  () =>
    import("@waslaeuftin/components/ui/calendar").then(
      (module) => module.Calendar,
    ),
  {
    loading: () => (
      <div className="h-[300px] w-[280px] p-4 text-sm">
        Kalender wird geladen…
      </div>
    ),
    ssr: false,
  },
);

export type DatePickerProps = {
  value?: Date;
  onChange: (day: Date | undefined) => void;
  compact?: boolean;
};

export function DatePicker({
  value,
  onChange,
  compact = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const quickDates = [
    { label: "Heute", date: scheduleCalendarDate() },
    { label: "Morgen", date: scheduleCalendarDate(1) },
  ];
  const quickLabel = quickDates.find(
    (day) =>
      value && serializeCalendarDate(day.date) === serializeCalendarDate(value),
  )?.label;
  const formattedDate = value
    ? new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        ...(compact ? {} : { year: "numeric" }),
      }).format(value)
    : "Datum auswählen";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "border-border/80 bg-background h-10 w-full justify-start rounded-lg text-left font-medium shadow-sm sm:w-[220px]",
            compact && "w-auto shrink-0 gap-1.5 px-2.5 text-xs sm:w-auto",
            !value && "text-muted-foreground",
          )}
          aria-label={`Datum wählen: ${compact && quickLabel ? quickLabel : formattedDate}`}
        >
          <CalendarIcon
            aria-hidden="true"
            className={compact ? "h-3.5 w-3.5" : "mr-2 h-4 w-4"}
          />
          {compact && quickLabel ? quickLabel : formattedDate}
          {compact && (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="border-border/80 w-auto rounded-lg p-0 shadow-lg">
        {compact && (
          <div className="border-border flex gap-2 border-b p-3">
            {quickDates.map((day) => (
              <Button
                key={day.label}
                variant={quickLabel === day.label ? "default" : "outline"}
                className="flex-1"
                aria-pressed={quickLabel === day.label}
                onClick={() => {
                  onChange(day.date);
                  setOpen(false);
                }}
              >
                {day.label}
              </Button>
            ))}
          </div>
        )}
        <Calendar
          mode="single"
          selected={value}
          onSelect={(day) => {
            onChange(day);
            if (compact) setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
