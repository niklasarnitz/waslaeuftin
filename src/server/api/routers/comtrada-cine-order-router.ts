import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import moment from "moment";
import { CinemaSchema } from "@waslaeuftin/types/Movie";
import { getComtradCineOrderMovies } from "@waslaeuftin/helpers/comtrada/cineorder/getComtradaCineOrderMovies";

export const comtradaCineOrderRouter = createTRPCRouter({
  getMovies: publicProcedure.input(CinemaSchema).query(async ({ input }) => {
    return getComtradCineOrderMovies(input);
  }),
  getMoviesOfToday: publicProcedure
    .input(CinemaSchema)
    .query(async ({ input }) => {
      return getComtradCineOrderMovies(input, moment().toDate());
    }),
});
