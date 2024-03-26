import { type z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/helpers/kino-ticket-express/getKinoTicketExpressMovies";
import moment from "moment";
import { KinoTicketsExpressCinemas } from "@waslaeuftin/types/Movie";

export type KinoTicketsExpressCinemasType = z.infer<
  typeof KinoTicketsExpressCinemas
>;

export const kinoTicketsExpressRouter = createTRPCRouter({
  getMovies: publicProcedure
    .input(KinoTicketsExpressCinemas)
    .query(async ({ input }) => {
      return getKinoTicketsExpressMovies(input);
    }),
  getMoviesOfToday: publicProcedure
    .input(KinoTicketsExpressCinemas)
    .query(async ({ input }) => {
      const movies = await getKinoTicketsExpressMovies(input);

      return movies
        .filter((movie) => {
          return movie.showings.some((showing) => {
            return moment().isSame(showing.dateTime, "day");
          });
        })
        .map((movie) => ({
          ...movie,
          showings: movie.showings.filter((showing) =>
            moment().isSame(showing.dateTime, "day"),
          ),
        }));
    }),
});
