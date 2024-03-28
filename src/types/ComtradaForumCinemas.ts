import { z } from "zod";

export const ComtradaForumCinemas = z.enum([
  "forum_rastatt",
  "forum_offenburg",
  "forum_lahr",
]);

export type ComtradaForumCinemasType = z.infer<typeof ComtradaForumCinemas>;
