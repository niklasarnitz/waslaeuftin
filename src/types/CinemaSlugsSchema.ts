import { z } from "zod";
import { KinoTicketsExpressCinemas } from "./KinoTicketsExpressCinemas";
import { ComtradaForumCinemas } from "./ComtradaForumCinemas";
import { ComtradaCineOrderCinemas } from "./ComtradaCineOrderCinemas";
import { KinoHeldCinemas } from "./KinoHeldCinemas";

export const CinemaSlugsSchema = z.enum([
  ...KinoTicketsExpressCinemas.options,
  ...ComtradaCineOrderCinemas.options,
  ...ComtradaForumCinemas.options,
  ...KinoHeldCinemas.options,
]);
export type CinemaSlugs = z.infer<typeof CinemaSlugsSchema>;
