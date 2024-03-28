import { z } from "zod";

export const KinoTicketsExpressCinemas = z.enum(["karlsruhe_kinemathek"]);

export type KinoTicketsExpressCinemasType = z.infer<
  typeof KinoTicketsExpressCinemas
>;
