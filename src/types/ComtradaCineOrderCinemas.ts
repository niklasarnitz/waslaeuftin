import { z } from "zod";

export const ComtradaCineOrderCinemas = z.enum([
  "zkm_karlsruhe",
  "universum_karlsruhe",
  "kinopolis_rosenheim",
  "mathaeser_filmpalast",
  "kinopolis_koblenz",
  "kinopolis_bad_godesberg",
  "kinopolis_landshut",
  "citydome_darmstadt",
  "kinopolis_darmstadt",
  "kinopolis_freiberg",
  "gloria_palast_münchen",
  "kinopolis_hanau",
  "kinopolis_gießen",
  "kinopolis_bad_homburg",
]);

export type ComtradaCineOrderCinemasType = z.infer<
  typeof ComtradaCineOrderCinemas
>;
