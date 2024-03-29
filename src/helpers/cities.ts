import { type Cinema } from "@waslaeuftin/types/Cinema";
import { Cinemas } from "@waslaeuftin/types/Cinemas";

export const Cities: Record<
  string,
  {
    name: string;
    fetchMoviesOfToday: () => Cinema[];
    fetchMovies: () => Cinema[];
  }
> = {
  karlsruhe: {
    name: "Karlsruhe",
    fetchMoviesOfToday: () => {
      return [
        Cinemas.zkm_karlsruhe,
        Cinemas.karlsruhe_kinemathek,
        Cinemas.karlsruhe_schauburg,
        Cinemas.universum_karlsruhe,
      ];
    },
    fetchMovies: () => {
      return [
        Cinemas.zkm_karlsruhe,
        Cinemas.karlsruhe_kinemathek,
        Cinemas.karlsruhe_schauburg,
        Cinemas.universum_karlsruhe,
      ];
    },
  },
  rastatt: {
    name: "Rastatt",
    fetchMoviesOfToday: () => {
      return [Cinemas.forum_rastatt];
    },
    fetchMovies: () => {
      return [Cinemas.forum_rastatt];
    },
  },
  leonberg: {
    name: "Leonberg",
    fetchMoviesOfToday: () => {
      return [Cinemas.traumpalast_leonberg];
    },
    fetchMovies: () => {
      return [Cinemas.traumpalast_leonberg];
    },
  },
  offenburg: {
    name: "Offenburg",
    fetchMoviesOfToday: () => {
      return [Cinemas.forum_offenburg];
    },
    fetchMovies: () => {
      return [Cinemas.forum_offenburg];
    },
  },

  lahr: {
    name: "Lahr",
    fetchMoviesOfToday: () => {
      return [Cinemas.forum_lahr];
    },
    fetchMovies: () => {
      return [Cinemas.forum_lahr];
    },
  },
  rosenheim: {
    name: "Rosenheim",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_rosenheim];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_rosenheim];
    },
  },
  muenchen: {
    name: "München",
    fetchMoviesOfToday: () => {
      return [Cinemas.mathaeser_filmpalast, Cinemas.gloria_palast_münchen];
    },
    fetchMovies: () => {
      return [Cinemas.mathaeser_filmpalast, Cinemas.gloria_palast_münchen];
    },
  },
  koblenz: {
    name: "Koblenz",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_koblenz];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_koblenz];
    },
  },
  bonn: {
    name: "Bonn",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_bad_godesberg];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_bad_godesberg];
    },
  },
  landshut: {
    name: "Landshut",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_landshut];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_landshut];
    },
  },
  darmstadt: {
    name: "Darmstadt",
    fetchMoviesOfToday: () => {
      return [Cinemas.citydome_darmstadt, Cinemas.kinopolis_darmstadt];
    },
    fetchMovies: () => {
      return [Cinemas.citydome_darmstadt, Cinemas.kinopolis_darmstadt];
    },
  },
  freiberg: {
    name: "Freiberg",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_freiberg];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_freiberg];
    },
  },
  hanau: {
    name: "Hanau",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_hanau];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_hanau];
    },
  },
  giessen: {
    name: "Gießen",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_gießen];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_gießen];
    },
  },
  badHomburg: {
    name: "Bad Homburg",
    fetchMoviesOfToday: () => {
      return [Cinemas.kinopolis_bad_homburg];
    },
    fetchMovies: () => {
      return [Cinemas.kinopolis_bad_homburg];
    },
  },
  gaggenau: {
    name: "Gaggenau",
    fetchMoviesOfToday: () => {
      return [Cinemas.merkur_filmcenter_gaggenau];
    },
    fetchMovies: () => {
      return [Cinemas.merkur_filmcenter_gaggenau];
    },
  },
  baden_baden: {
    name: "Baden-Baden",
    fetchMoviesOfToday: () => {
      return [Cinemas.moviac_baden_baden, Cinemas.cineplex_baden_baden];
    },
    fetchMovies: () => {
      return [Cinemas.moviac_baden_baden, Cinemas.cineplex_baden_baden];
    },
  },
  bruchsal: {
    name: "Bruchsal",
    fetchMoviesOfToday: () => {
      return [Cinemas.cineplex_bruchsal];
    },
    fetchMovies: () => {
      return [Cinemas.cineplex_bruchsal];
    },
  },
  walldorf: {
    name: "Walldorf",
    fetchMoviesOfToday: () => {
      return [Cinemas.luxor_walldorf];
    },
    fetchMovies: () => {
      return [Cinemas.luxor_walldorf];
    },
  },
};
