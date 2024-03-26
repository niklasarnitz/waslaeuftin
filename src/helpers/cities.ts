import { api } from "@waslaeuftin/trpc/server";
import { type Movie } from "@waslaeuftin/types/Movie";

export const Cities: Record<
  string,
  {
    name: string;
    fetchMoviesOfToday: () => Promise<Movie[]>;
    fetchMovies: () => Promise<Movie[]>;
  }
> = {
  karlsruhe: {
    name: "Karlsruhe",
    fetchMoviesOfToday: async () => {
      return (
        await Promise.all([
          api.kinoTicketsExpress.getMoviesOfToday("karlsruhe_kinemathek"),
          api.kinoTicketsExpress.getMoviesOfToday("karlsruhe_schauburg"),
        ])
      ).flat();
    },
    fetchMovies: async () => {
      return (
        await Promise.all([
          api.kinoTicketsExpress.getMovies("karlsruhe_kinemathek"),
          api.kinoTicketsExpress.getMovies("karlsruhe_schauburg"),
        ])
      ).flat();
    },
  },
};
