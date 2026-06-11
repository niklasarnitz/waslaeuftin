"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import moment from "moment-timezone";

import { Button } from "@waslaeuftin/components/ui/button";
import { Calendar } from "@waslaeuftin/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@waslaeuftin/components/ui/popover";
import { cn } from "@waslaeuftin/lib/utils";

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
            moment(value).format("DD.MM.YYYY")
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
