import { api } from "@waslaeuftin/trpc/server";
import { type Movie } from "@waslaeuftin/types/Movie";

export const Cities: Record<
  string,
  {
    name: string;
    fetchMoviesOfToday: () => Promise<Movie[]>;
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
  },
};
