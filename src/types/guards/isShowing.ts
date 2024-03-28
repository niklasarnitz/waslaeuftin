import { type Showing, ShowingSchema } from "../Showing";

export const isShowing = (input: unknown): input is Showing => {
  return ShowingSchema.safeParse(input).success;
};
