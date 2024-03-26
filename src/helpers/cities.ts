import { api } from "@waslaeuftin/trpc/server";
import { Cinemas } from "@waslaeuftin/types/Movie";

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
};
