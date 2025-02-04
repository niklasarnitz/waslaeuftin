"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@waslaeuftin/components/ui/popover";
import { Button } from "@waslaeuftin/components/ui/button";
import { cn } from "@waslaeuftin/lib/utils";
import { Calendar } from "@waslaeuftin/components/ui/calendar";
import moment from "moment-timezone";

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
            "w-[280px] justify-start text-left font-normal",
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
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
