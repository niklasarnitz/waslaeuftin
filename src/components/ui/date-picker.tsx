"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@waslaeuftin/components/ui/popover";
import { Button } from "@waslaeuftin/components/ui/button";
import { cn } from "@waslaeuftin/app/lib/utils";
import { Calendar } from "@waslaeuftin/components/ui/calendar";

export type DatePickerProps = {
  value?: Date;
  onChange: (day: Date | undefined) => void;
  isAllowedToSelectPast?: boolean;
};

export function DatePicker({
  value,
  onChange,
  isAllowedToSelectPast,
}: DatePickerProps) {
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
          {value ? format(value, "PPP") : <span>Datum auswählen</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          isAllowedToSelectPast={isAllowedToSelectPast}
        />
      </PopoverContent>
    </Popover>
  );
}
