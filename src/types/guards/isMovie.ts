import { type Movie } from "@prisma/client";
import { z } from "zod";

const MovieSchema = z.object({
  name: z.string(),
});

export const isMovie = (input: unknown): input is Movie => {
  return MovieSchema.safeParse(input).success;
};
