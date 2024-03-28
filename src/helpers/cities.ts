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

      return api.movies.getMoviesForManyCinemas({
        cinemas: [
          Cinemas.zkm_karlsruhe,
          Cinemas.karlsruhe_kinemathek,
          Cinemas.karlsruhe_schauburg,
          Cinemas.universum_karlsruhe,
        ],
        date,
      });
    },
    fetchMovies: async () => {
      return api.movies.getMoviesForManyCinemas({
        cinemas: [
          Cinemas.zkm_karlsruhe,
          Cinemas.karlsruhe_kinemathek,
          Cinemas.karlsruhe_schauburg,
          Cinemas.universum_karlsruhe,
        ],
      });
    },
  },
  "karlsruhe-rastatt": {
    name: "Karlsruhe & Rastatt",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return api.movies.getMoviesForManyCinemas({
        cinemas: [
          Cinemas.zkm_karlsruhe,
          Cinemas.karlsruhe_kinemathek,
          Cinemas.karlsruhe_schauburg,
          Cinemas.forum_rastatt,
          Cinemas.universum_karlsruhe,
          Cinemas.merkur_filmcenter_gaggenau,
        ],
        date,
      });
    },
    fetchMovies: async () => {
      return api.movies.getMoviesForManyCinemas({
        cinemas: [
          Cinemas.zkm_karlsruhe,
          Cinemas.karlsruhe_kinemathek,
          Cinemas.karlsruhe_schauburg,
          Cinemas.forum_rastatt,
          Cinemas.universum_karlsruhe,
          Cinemas.merkur_filmcenter_gaggenau,
        ],
      });
    },
  },
  rastatt: {
    name: "Rastatt",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_rastatt],
        date,
      });
    },
    fetchMovies: async () => {
      return api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_rastatt],
      });
    },
  },
  leonberg: {
    name: "Leonberg",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.traumpalast_leonberg],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.traumpalast_leonberg],
      });
    },
  },
  offenburg: {
    name: "Offenburg",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_offenburg],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_offenburg],
      });
    },
  },

  lahr: {
    name: "Lahr",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_lahr],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.forum_lahr],
      });
    },
  },
  rosenheim: {
    name: "Rosenheim",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_rosenheim],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_rosenheim],
      });
    },
  },
  muenchen: {
    name: "München",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.mathaeser_filmpalast, Cinemas.gloria_palast_münchen],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.mathaeser_filmpalast, Cinemas.gloria_palast_münchen],
      });
    },
  },
  koblenz: {
    name: "Koblenz",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_koblenz],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_koblenz],
      });
    },
  },
  bonn: {
    name: "Bonn",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_bad_godesberg],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_bad_godesberg],
      });
    },
  },
  landshut: {
    name: "Landshut",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_landshut],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_landshut],
      });
    },
  },
  darmstadt: {
    name: "Darmstadt",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.citydome_darmstadt, Cinemas.kinopolis_darmstadt],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.citydome_darmstadt, Cinemas.kinopolis_darmstadt],
      });
    },
  },
  freiberg: {
    name: "Freiberg",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_freiberg],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_freiberg],
      });
    },
  },
  hanau: {
    name: "Hanau",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_hanau],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_hanau],
      });
    },
  },
  giessen: {
    name: "Gießen",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_gießen],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_gießen],
      });
    },
  },
  badHomburg: {
    name: "Bad Homburg",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_bad_homburg],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.kinopolis_bad_homburg],
      });
    },
  },
  gaggenau: {
    name: "Gaggenau",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.merkur_filmcenter_gaggenau],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.merkur_filmcenter_gaggenau],
      });
    },
  },
  baden_baden: {
    name: "Baden-Baden",
    fetchMoviesOfToday: async () => {
      const date = new Date();

      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.moviac_baden_baden, Cinemas.cineplex_baden_baden],
        date,
      });
    },
    fetchMovies: async () => {
      return await api.movies.getMoviesForManyCinemas({
        cinemas: [Cinemas.moviac_baden_baden, Cinemas.cineplex_baden_baden],
      });
    },
  },
};
