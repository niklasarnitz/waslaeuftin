import { KinoheldCinemas } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCinemaSlugs";
import { KinoHeldCinemas } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCinemas";
import { z } from "zod";

export const KinoTicketsExpressCinemas = z.enum([
  "karlsruhe_kinemathek",
  "karlsruhe_schauburg",
]);

export type KinoTicketsExpressCinemasType = z.infer<
  typeof KinoTicketsExpressCinemas
>;

export const ComtradaForumCinemas = z.enum([
  "forum_rastatt",
  "forum_offenburg",
  "forum_lahr",
]);

export type ComtradaForumCinemasType = z.infer<typeof ComtradaForumCinemas>;

export const ComtradaCineOrderCinemas = z.enum(["zkm_karlsruhe"]);

export const CinemaSlugsSchema = z.enum([
  ...KinoTicketsExpressCinemas.options,
  ...ComtradaCineOrderCinemas.options,
  ...ComtradaForumCinemas.options,
  ...KinoheldCinemas.options,
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
  ...KinoHeldCinemas,
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
