import { z } from "zod";

export const KinoTicketsExpressCinemas = z.enum([
  "karlsruhe_kinemathek",
  "karlsruhe_schauburg",
]);

export type KinoTicketsExpressCinemasType = z.infer<
  typeof KinoTicketsExpressCinemas
>;
