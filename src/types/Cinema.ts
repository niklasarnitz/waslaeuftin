import { z } from "zod";
import { CinemaSlugsSchema } from "./CinemaSlugsSchema";

export const CinemaSchema = z.object({
  name: z.string(),
  url: z.string(),
  slug: CinemaSlugsSchema,
});

export type Cinema = z.infer<typeof CinemaSchema>;
