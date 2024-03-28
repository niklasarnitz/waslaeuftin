import { z } from "zod";

export const ShowingSchema = z.object({
  dateTime: z.date(),
  bookingUrl: z.string().optional(),
  showingAdditionalData: z.string().optional(),
});

export type Showing = z.infer<typeof ShowingSchema>;
