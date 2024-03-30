"use client";

import { DatePicker } from "@waslaeuftin/components/ui/date-picker";
import moment from "moment-timezone";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

export const UrlDatePicker = () => {
  const [date, setDate] = useQueryState("date", {
    parse: (query) => moment(query).toDate(),
    serialize: (date) => moment(date).format("YYYY-MM-DD"),
    shallow: false,
  });

  const updateDate = useCallback(
    async (date: Date | undefined) => {
      await setDate(date ?? null);
    },
    [setDate],
  );

  return (
    <>
      <DatePicker
        value={date ?? undefined}
        onChange={updateDate}
        isAllowedToSelectPast={false}
      />
    </>
  );
};
