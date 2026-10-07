import { cache } from "react";
import moment from "moment-timezone";

import { createScheduleDate } from "@waslaeuftin/core";
import { db } from "@waslaeuftin/db/client";
import { buildHighlights } from "@waslaeuftin/helpers/programme";
import { api } from "@waslaeuftin/trpc/server";

// Primitive keys share one request's data across metadata, header and page.
export const cityProgramme = cache((slug: string, date?: string) =>
  api.cities.getCityMoviesAndShowingsBySlug({
    slug,
    date: date
      ? moment.tz(date, "Europe/Berlin").toDate()
      : createScheduleDate(),
  }),
);
export const cinemaProgramme = cache((slug: string, date?: string) =>
  api.cinemas.getCinemaBySlug({
    cinemaSlug: slug,
    date: date
      ? moment.tz(date, "Europe/Berlin").toDate()
      : createScheduleDate(),
  }),
);
export const cityHighlights = cache(async (cityId: number) => {
  const now = new Date();
  const showings = await db.showing.findMany({
    where: {
      cinema: { cityId },
      dateTime: {
        gte: now,
        lt: moment(now)
          .tz("Europe/Berlin")
          .add(8, "days")
          .startOf("day")
          .toDate(),
      },
    },
    orderBy: { dateTime: "asc" },
    select: {
      dateTime: true,
      rawMovieName: true,
      showingAdditionalData: true,
      movie: { select: { name: true } },
      cinema: { select: { name: true, slug: true, country: true } },
    },
  });
  return buildHighlights(showings, now);
});

export const cinemaAlternatives = cache((cityId: number, cinemaId: number) =>
  db.cinema.findMany({
    where: { cityId, id: { not: cinemaId } },
    orderBy: { name: "asc" },
    take: 6,
    select: { id: true, name: true, slug: true },
  }),
);
