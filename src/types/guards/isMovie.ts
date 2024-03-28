import { type Movie, MovieSchema } from "../Movie";

export const isMovie = (input: unknown): input is Movie => {
  return MovieSchema.safeParse(input).success;
};
