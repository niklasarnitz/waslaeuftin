import { z } from "zod";

export const KinoTicketsExpressCinemas = z.enum([
  "karlsruhe_kinemathek",
  "karlsruhe_schauburg",
]);

export const CinemaSlugsSchema = KinoTicketsExpressCinemas;
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
};

export const ShowingSchema = z.object({
  dateTime: z.date(),
  bookingUrl: z.string().optional(),
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
