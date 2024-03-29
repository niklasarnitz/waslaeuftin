import { z } from "zod";
import { CinemaSchema } from "./Cinema";
import { ShowingSchema } from "./Showing";

export const MovieSchema = z.object({
  name: z.string().min(1),
  showings: z.array(ShowingSchema),
  cinema: CinemaSchema,
});

export type Movie = z.infer<typeof MovieSchema>;
