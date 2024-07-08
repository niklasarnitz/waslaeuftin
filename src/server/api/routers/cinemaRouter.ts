import { env } from "@waslaeuftin/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import moment from "moment-timezone";
import { z } from "zod";

export const cinemaRouter = createTRPCRouter({
  getCinemaBySlug: publicProcedure
    .input(z.object({ cinemaSlug: z.string(), date: z.date().optional() }))
    .query(async ({ input, ctx }) => {
      return await ctx.db.cinema.findFirst({
        where: {
          slug: input.cinemaSlug,
          city: {
            country: env.COUNTRY,
          },
        },
        include: {
          movies: {
            orderBy: {
              name: "asc",
            },
            include: {
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
});
