"use client";

import { DatePicker } from "@waslaeuftin/components/ui/date-picker";
import moment from "moment-timezone";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

export const UrlDatePicker = (
  props: { citySlug: string } | { cinemaSlug: string },
) => {
  const citySlug = "citySlug" in props ? props.citySlug : undefined;
  const cinemaSlug = "cinemaSlug" in props ? props.cinemaSlug : undefined;

  const [date, setDate] = useQueryState("date", {
    parse: (query) => moment(query).toDate(),
    serialize: (date) => moment(date).format("YYYY-MM-DD"),
    shallow: false,
  });

  const pathName = usePathname();
  const router = useRouter();

  const updateDate = useCallback(
    async (date: Date | undefined) => {
      if (moment(date).isSame(moment(), "day")) {
        router.push(
          `/${citySlug ? "city" : "cinema"}/${citySlug ?? cinemaSlug}/${citySlug ? "today" : ""}`,
        );
      } else if (pathName.includes("/today")) {
        router.push(
          `/${citySlug ? "city" : "cinema"}/${citySlug ? citySlug : cinemaSlug}?date=${moment(date).format("YYYY-MM-DD")}`,
        );
      } else {
        await setDate(date ?? null);
      }
    },
    [cinemaSlug, citySlug, pathName, router, setDate],
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
