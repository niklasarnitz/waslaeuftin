import { z } from "zod";

export const RequestCinemaSchema = z.object({
  cinemaName: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  city: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  cinemaHomepageUrl: z.string().url("Die Eingabe muss eine gültige URL sein."),
});

export type RequestCinemaFormData = z.infer<typeof RequestCinemaSchema>;
