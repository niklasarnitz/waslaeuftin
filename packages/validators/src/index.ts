import { z } from "zod";

export const RequestCinemaSchema = z.object({
  cinemaName: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  city: z.string().min(1, "Die Eingabe darf nicht leer sein."),
  cinemaHomepageUrl: z.url({
    error: "Die Eingabe muss eine gültige URL sein.",
  }),
});

export const CinemaBySlugInputSchema = z.object({
  cinemaSlug: z.string(),
  date: z.coerce.date().optional(),
});

export const NearbyCinemasInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  maxDistanceKm: z.number().positive().max(250).default(20),
  date: z.coerce.date().optional(),
});

export const CitySlugSchema = z.string();
export const CityQuerySchema = z.string().optional();
export const CitySearchSchema = z.string();
export const CityIdSchema = z.number();

export const CityMoviesAndShowingsInputSchema = z.object({
  slug: z.string(),
  date: z.coerce.date().optional(),
});

export const RawLocationInputSchema = z
  .object({
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    maxDistanceKm: z.coerce.number().optional(),
    radiusKm: z.coerce.number().optional(),
  })
  .transform((value) => ({
    latitude: value.latitude ?? value.lat,
    longitude: value.longitude ?? value.lng,
    maxDistanceKm: value.maxDistanceKm ?? value.radiusKm ?? 20,
  }));

export const LocationInputSchema = NearbyCinemasInputSchema.omit({
  date: true,
});

// ─── Reminders / push notifications ─────────────────────────────────────────

/** ISO 3166-1 alpha-2 country/region code used for TMDB upcoming queries. */
export const RegionSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase())
  .catch("DE");

export const DeviceIdSchema = z.string().min(1).max(128);

export const RegisterDeviceInputSchema = z.object({
  deviceId: DeviceIdSchema,
  expoPushToken: z.string().min(1).optional(),
  country: z.enum(["GERMANY", "AUSTRIA"]).optional(),
});

export const ReportNearbyCinemasInputSchema = z.object({
  deviceId: DeviceIdSchema,
  cinemaIds: z.array(z.number().int().positive()).max(200),
});

export const AddReminderInputSchema = z.object({
  deviceId: DeviceIdSchema,
  tmdbMovieId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  posterPath: z.string().min(1).optional(),
});

export const RemoveReminderInputSchema = z.object({
  deviceId: DeviceIdSchema,
  tmdbMovieId: z.number().int().positive(),
});

export const GetRemindersInputSchema = z.object({
  deviceId: DeviceIdSchema,
});

export const UpcomingMoviesInputSchema = z.object({
  region: RegionSchema.optional(),
});

export const NearbyCinemasForMovieInputSchema = NearbyCinemasInputSchema.extend(
  {
    tmdbMovieId: z.number().int().positive(),
  },
);

export const ProviderShowingSchema = z.object({
  dateTime: z.date(),
  bookingUrl: z.string().optional(),
  showingAdditionalData: z.array(z.string()).optional(),
});

export const ProviderMovieSchema = z.object({
  name: z.string(),
});

export const ProviderMovieWithShowingsSchema = ProviderMovieSchema.extend({
  cinemaId: z.number(),
  showings: z.array(ProviderShowingSchema),
});

export type RequestCinemaFormData = z.infer<typeof RequestCinemaSchema>;
export type ProviderShowing = z.infer<typeof ProviderShowingSchema>;
export type ProviderMovieWithShowings = z.infer<
  typeof ProviderMovieWithShowingsSchema
>;
