"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@waslaeuftin/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@waslaeuftin/components/ui/popover";
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
};

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "border-border/80 bg-background h-10 w-full justify-start rounded-lg text-left font-medium shadow-sm sm:w-[220px]",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            new Intl.DateTimeFormat("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(value)
          ) : (
            <span>Datum auswählen</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="border-border/80 w-auto rounded-lg p-0 shadow-lg">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
