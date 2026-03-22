import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { endOfDay, startOfDay } from "date-fns";
import moment from "moment-timezone";
import { z } from "zod";

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (
  originLat: number,
  originLon: number,
  targetLat: number,
  targetLon: number,
) => {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(targetLat - originLat);
  const lonDelta = toRadians(targetLon - originLon);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(originLat)) *
      Math.cos(toRadians(targetLat)) *
      Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
};

export const cinemaRouter = createTRPCRouter({
  getCinemaBySlug: publicProcedure
    .input(
      z.object({
        cinemaSlug: z.string(),
        date: z.date().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await ctx.db.cinema.findFirst({
        where: {
          slug: input.cinemaSlug,
        },
        include: {
          movies: {
            orderBy: {
              name: "asc",
            },
            select: {
              name: true,
              coverUrl: true,
              showings: {
                orderBy: {
                  dateTime: "asc",
                },
                where: input.date
                  ? {
                      dateTime: {
                        lt:
                          moment(input.date).format("YYYY-MM-DD") +
                          "T23:59:59.999Z",
                        gt: input.date?.toISOString(),
                      },
                    }
                  : undefined,
              },
            },
            where: input.date
              ? {
                  showings: {
                    some: {
                      dateTime: {
                        lt: input.date
                          ? moment(input.date).endOf("day").toDate()
                          : undefined,
                        gt: input.date?.toISOString() ?? undefined,
                      },
                    },
                  },
                }
              : undefined,
          },
        },
      });
    }),
  getNearbyCinemas: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        maxDistanceKm: z.number().positive().max(250).default(20),
        limit: z.number().int().positive().max(30).default(8),
      }),
    )
    .query(async ({ input, ctx }) => {
      const now = new Date();
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);

      const cinemas = await ctx.db.cinema.findMany({
        where: {
          latitude: {
            not: null,
          },
          longitude: {
            not: null,
          },
          movies: {
            some: {
              showings: {
                some: {
                  dateTime: {
                    gte: dayStart,
                    lte: dayEnd,
                  },
                },
              },
            },
          },
        },
        include: {
          city: {
            select: {
              name: true,
              slug: true,
            },
          },
          movies: {
            where: {
              showings: {
                some: {
                  dateTime: {
                    gte: dayStart,
                    lte: dayEnd,
                  },
                },
              },
            },
            orderBy: {
              name: "asc",
            },
            select: {
              name: true,
              coverUrl: true,
              showings: {
                where: {
                  dateTime: {
                    gte: dayStart,
                    lte: dayEnd,
                  },
                },
                orderBy: {
                  dateTime: "asc",
                },
              },
            },
          },
        },
      });

      return cinemas
        .map((cinema) => {
          const distanceKm = haversineDistanceKm(
            input.latitude,
            input.longitude,
            cinema.latitude ?? 0,
            cinema.longitude ?? 0,
          );

          return {
            ...cinema,
            distanceKm,
          };
        })
        .filter((cinema) => cinema.distanceKm <= input.maxDistanceKm)
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, input.limit);
    }),
});
