import { cache } from "react";

import { db } from "@waslaeuftin/db/client";

// Share the lookup between metadata and server-rendered page content.
export const nextCinemaShowing = cache(async (cinemaId: number) =>
  db.showing.findFirst({
    where: { cinemaId, dateTime: { gte: new Date() } },
    orderBy: { dateTime: "asc" },
    select: {
      dateTime: true,
      bookingUrl: true,
      movie: { select: { name: true } },
    },
  }),
);

export const nextCityShowing = cache(async (cityId: number) =>
  db.showing.findFirst({
    where: { cinema: { cityId }, dateTime: { gte: new Date() } },
    orderBy: { dateTime: "asc" },
    select: {
      dateTime: true,
      bookingUrl: true,
      movie: { select: { name: true } },
    },
  }),
);
