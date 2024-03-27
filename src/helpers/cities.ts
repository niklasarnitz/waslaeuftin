import { api } from "@waslaeuftin/trpc/server";
import { Cinemas } from "@waslaeuftin/types/Movie";
import moment from "moment";

export const Cities: Record<
  string,
  {
    name: string;
    fetchMoviesOfToday: () => ReturnType<typeof api.movies.getMovies>;
    fetchMovies: () => ReturnType<typeof api.movies.getMovies>;
  }
> = {
  karlsruhe: {
    name: "Karlsruhe",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.zkm_karlsruhe, date }),
          api.movies.getMovies({
            cinema: Cinemas.karlsruhe_kinemathek,
            date,
          }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_schauburg, date }),
        ])
      ).flat();
    },
    fetchMovies: async () => {
      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.zkm_karlsruhe }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_kinemathek }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_schauburg }),
        ])
      ).flat();
    },
  },
  "karlsruhe-rastatt": {
    name: "Karlsruhe & Rastatt",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.zkm_karlsruhe, date }),
          api.movies.getMovies({
            cinema: Cinemas.karlsruhe_kinemathek,
            date,
          }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_schauburg, date }),
          api.movies.getMovies({ cinema: Cinemas.forum_rastatt, date }),
        ])
      ).flat();
    },
    fetchMovies: async () => {
      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.zkm_karlsruhe }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_kinemathek }),
          api.movies.getMovies({ cinema: Cinemas.karlsruhe_schauburg }),
          api.movies.getMovies({ cinema: Cinemas.forum_rastatt }),
        ])
      ).flat();
    },
  },
  rastatt: {
    name: "Rastatt",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.forum_rastatt, date }),
        ])
      ).flat();
    },
    fetchMovies: async () => {
      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.forum_rastatt }),
        ])
      ).flat();
    },
  },
  leonberg: {
    name: "Leonberg",
    fetchMoviesOfToday: async () => {
      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.traumpalast_leonberg }),
        ])
      )
        .flat()
        .filter((movie) =>
          movie.showings.some((showing) =>
            moment().isSame(showing.dateTime, "day"),
          ),
        )
        .map((movie) => ({
          ...movie,
          showings: movie.showings.filter((showing) =>
            moment().isSame(showing.dateTime, "day"),
          ),
        }));
    },
    fetchMovies: async () => {
      return (
        await Promise.all([
          api.movies.getMovies({ cinema: Cinemas.traumpalast_leonberg }),
        ])
      ).flat();
    },
  },
};
