import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import moment from "moment-timezone";
import { z } from "zod";

export const citiesRouter = createTRPCRouter({
  getCityMoviesAndShowingsBySlug: publicProcedure
    .input(z.object({ slug: z.string(), date: z.date().optional() }))
    .query(async ({ input, ctx }) => {
      return await ctx.db.city.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          cinemas: {
            where: input.date
              ? {
                  movies: {
                    some: {
                      showings: {
                        some: {
                          dateTime: {
                            lt:
                              moment(input.date).format("YYYY-MM-DD") +
                              "T23:59:59.999Z",
                            gt: input.date?.toISOString(),
                          },
                        },
                      },
                    },
                  },
                }
              : undefined,
            orderBy: {
              name: "asc",
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
          },
        },
      });
    }),
});
