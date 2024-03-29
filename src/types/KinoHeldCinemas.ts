import { z } from "zod";

export const KinoHeldCinemas = z.enum([
  "traumpalast_leonberg",
  "merkur_filmcenter_gaggenau",
  "moviac_baden_baden",
  "cineplex_baden_baden",
  "cineplex_bruchsal",
]);

export type KinoHeldCinemasType = z.infer<typeof KinoHeldCinemas>;
