import { z } from "zod";

export const KinoTicketsExpressCinemas = z.enum(["karlsruhe_kinemathek"]);

export type KinoTicketsExpressCinemasType = z.infer<
  typeof KinoTicketsExpressCinemas
>;

export const ComtradaForumCinemas = z.enum([
  "forum_rastatt",
  "forum_offenburg",
  "forum_lahr",
]);

export type ComtradaForumCinemasType = z.infer<typeof ComtradaForumCinemas>;

export const ComtradaCineOrderCinemas = z.enum([
  "zkm_karlsruhe",
  "universum_karlsruhe",
  "kinopolis_rosenheim",
  "mathaeser_filmpalast",
  "kinopolis_koblenz",
  "kinopolis_bad_godesberg",
  "kinopolis_landshut",
  "citydome_darmstadt",
  "kinopolis_darmstadt",
  "kinopolis_freiberg",
  "gloria_palast_münchen",
  "kinopolis_hanau",
  "kinopolis_gießen",
  "kinopolis_bad_homburg",
]);

export type ComtradaCineOrderCinemasType = z.infer<
  typeof ComtradaCineOrderCinemas
>;

export const KinoHeldCinemas = z.enum([
  "traumpalast_leonberg",
  "karlsruhe_schauburg",
  "merkur_filmcenter_gaggenau",
  "moviac_baden_baden",
  "cineplex_baden_baden",
]);

export type KinoHeldCinemasType = z.infer<typeof KinoHeldCinemas>;

export const CinemaSlugsSchema = z.enum([
  ...KinoTicketsExpressCinemas.options,
  ...ComtradaCineOrderCinemas.options,
  ...ComtradaForumCinemas.options,
  ...KinoHeldCinemas.options,
]);
export type CinemaSlugs = z.infer<typeof CinemaSlugsSchema>;

export const CinemaSchema = z.object({
  name: z.string(),
  url: z.string(),
  slug: CinemaSlugsSchema,
});

export type Cinema = z.infer<typeof CinemaSchema>;

export const Cinemas: Record<CinemaSlugs, Cinema> = {
  karlsruhe_kinemathek: {
    name: "Kinemathek Karlsruhe",
    url: "https://kinemathek-karlsruhe.de/",
    slug: "karlsruhe_kinemathek",
  },
  karlsruhe_schauburg: {
    name: "Schauburg Karlsruhe",
    url: "https://schauburg.de",
    slug: "karlsruhe_schauburg",
  },
  zkm_karlsruhe: {
    name: "ZKM Karlsruhe",
    url: "https://zkm-karlsruhe.de/",
    slug: "zkm_karlsruhe",
  },
  forum_lahr: {
    name: "Forum Lahr",
    url: "https://www.forumcinemas.de/",
    slug: "forum_lahr",
  },
  forum_offenburg: {
    name: "Forum Offenberg",
    url: "https://www.forumcinemas.de/",
    slug: "forum_offenburg",
  },
  forum_rastatt: {
    name: "Forum Rastatt",
    url: "https://www.forumcinemas.de/",
    slug: "forum_rastatt",
  },
  universum_karlsruhe: {
    name: "Universum Karlsruhe",
    url: "https://www.kinopolis.de/ka",
    slug: "universum_karlsruhe",
  },
  kinopolis_rosenheim: {
    name: "Kinopolis Rosenheim",
    url: "https://www.kinopolis.de/ro",
    slug: "kinopolis_rosenheim",
  },
  mathaeser_filmpalast: {
    name: "Mathaeser Filmpalast München",
    url: "https://www.mathaeser.de/mm",
    slug: "mathaeser_filmpalast",
  },
  traumpalast_leonberg: {
    name: "Traumpalast Leonberg",
    url: "https://www.kinoheld.de/kino/leonberg-wuerttemberg/traumpalast-leonberg/vorstellungen",
    slug: "traumpalast_leonberg",
  },
  kinopolis_koblenz: {
    name: "Kinopolis Koblenz",
    url: "https://www.kinopolis.de/ko",
    slug: "kinopolis_koblenz",
  },
  kinopolis_bad_godesberg: {
    name: "Kinopolis Bad Godesberg",
    url: "https://cotest.kinopolis.de/bn",
    slug: "kinopolis_bad_godesberg",
  },
  kinopolis_landshut: {
    name: "Kinopolis Landshut",
    url: "https://cotest.kinopolis.de/ls",
    slug: "kinopolis_landshut",
  },
  citydome_darmstadt: {
    name: "Citydome Darmstadt",
    url: "https://cotest.kinopolis.de/cd",
    slug: "citydome_darmstadt",
  },
  kinopolis_darmstadt: {
    name: "Kinopolis Darmstadt",
    url: "https://cotest.kinopolis.de/kp",
    slug: "kinopolis_darmstadt",
  },
  kinopolis_freiberg: {
    name: "Kinopolis Freiberg",
    url: "https://cotest.kinopolis.de/fr",
    slug: "kinopolis_freiberg",
  },
  gloria_palast_münchen: {
    name: "Gloria Palast München",
    url: "https://www.gloria-palast.de/gp",
    slug: "gloria_palast_münchen",
  },
  kinopolis_hanau: {
    name: "Kinopolis Hanau",
    url: "https://kinopolis.de/hu",
    slug: "kinopolis_hanau",
  },
  kinopolis_gießen: {
    name: "Kinopolis Gießen",
    url: "https://www.kinopolis.de/kg",
    slug: "kinopolis_gießen",
  },
  kinopolis_bad_homburg: {
    name: "Kinopolis Bad Homburg",
    url: "https://cotest.kinopolis.de/bh",
    slug: "kinopolis_bad_homburg",
  },
  merkur_filmcenter_gaggenau: {
    name: "Merkur Film Center Gaggenau",
    url: "https://merkur-film-center.de/",
    slug: "merkur_filmcenter_gaggenau",
  },
  moviac_baden_baden: {
    name: "moviac - Kino im Kaiserhof",
    url: "https://www.moviac.de/",
    slug: "moviac_baden_baden",
  },
  cineplex_baden_baden: {
    name: "Cineplex Baden-Baden",
    url: "https://www.cineplex.de/baden-baden/",
    slug: "cineplex_baden_baden",
  },
};

export const ShowingSchema = z.object({
  dateTime: z.date(),
  bookingUrl: z.string().optional(),
  showingAdditionalData: z.string().optional(),
});

export type Showing = z.infer<typeof ShowingSchema>;

export const isShowing = (input: unknown): input is Showing => {
  return ShowingSchema.safeParse(input).success;
};

export const MovieSchema = z.object({
  name: z.string().min(1),
  format: z.string().optional(),
  showings: z.array(ShowingSchema),
  cinema: CinemaSchema,
});

export type Movie = z.infer<typeof MovieSchema>;

export const isMovie = (input: unknown): input is Movie => {
  return MovieSchema.safeParse(input).success;
};
