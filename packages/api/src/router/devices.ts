import { fetchUpcomingMovies } from "@waslaeuftin/api/internal/tmdb";
import {
  createTRPCRouter,
  publicProcedure,
} from "@waslaeuftin/api/internal/trpc";
import {
  AddReminderInputSchema,
  GetRemindersInputSchema,
  RegisterDeviceInputSchema,
  RemoveReminderInputSchema,
  ReportNearbyCinemasInputSchema,
  UpcomingMoviesInputSchema,
} from "@waslaeuftin/validators";

// Cap on how many cinemas we retain per device for vicinity matching.
const MAX_CINEMAS_PER_DEVICE = 20;

export const devicesRouter = createTRPCRouter({
  // Anonymous device registration / heartbeat. The push token is optional so
  // the device can register even before notification permission is granted.
  registerDevice: publicProcedure
    .input(RegisterDeviceInputSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.device.upsert({
        where: { id: input.deviceId },
        create: {
          id: input.deviceId,
          expoPushToken: input.expoPushToken,
          country: input.country,
        },
        update: {
          expoPushToken: input.expoPushToken,
          country: input.country,
          lastSeenAt: new Date(),
        },
      });
      return { ok: true };
    }),

  // Accumulate a popularity tally of cinemas seen near the device, then prune
  // back to the top `MAX_CINEMAS_PER_DEVICE` by count. Stores no coordinates.
  reportNearbyCinemas: publicProcedure
    .input(ReportNearbyCinemasInputSchema)
    .mutation(async ({ input, ctx }) => {
      const cinemaIds = Array.from(new Set(input.cinemaIds));
      if (cinemaIds.length === 0) {
        return { ok: true };
      }

      // Ensure the device exists so the FK upserts below succeed.
      await ctx.db.device.upsert({
        where: { id: input.deviceId },
        create: { id: input.deviceId },
        update: { lastSeenAt: new Date() },
      });

      const now = new Date();
      await ctx.db.$transaction(
        cinemaIds.map((cinemaId) =>
          ctx.db.deviceCinemaPopularity.upsert({
            where: {
              deviceId_cinemaId: { deviceId: input.deviceId, cinemaId },
            },
            create: { deviceId: input.deviceId, cinemaId, lastSeenAt: now },
            update: { count: { increment: 1 }, lastSeenAt: now },
          }),
        ),
      );

      // Prune to the most popular cinemas for this device.
      const kept = await ctx.db.deviceCinemaPopularity.findMany({
        where: { deviceId: input.deviceId },
        orderBy: [{ count: "desc" }, { lastSeenAt: "desc" }],
        select: { id: true },
        take: MAX_CINEMAS_PER_DEVICE,
      });
      await ctx.db.deviceCinemaPopularity.deleteMany({
        where: {
          deviceId: input.deviceId,
          id: { notIn: kept.map((row) => row.id) },
        },
      });

      return { ok: true };
    }),

  addReminder: publicProcedure
    .input(AddReminderInputSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.device.upsert({
        where: { id: input.deviceId },
        create: { id: input.deviceId },
        update: { lastSeenAt: new Date() },
      });

      const reminder = await ctx.db.reminder.upsert({
        where: {
          deviceId_tmdbMovieId: {
            deviceId: input.deviceId,
            tmdbMovieId: input.tmdbMovieId,
          },
        },
        create: {
          deviceId: input.deviceId,
          tmdbMovieId: input.tmdbMovieId,
          title: input.title,
          posterPath: input.posterPath,
        },
        update: { title: input.title, posterPath: input.posterPath },
      });

      return reminder;
    }),

  removeReminder: publicProcedure
    .input(RemoveReminderInputSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.reminder.deleteMany({
        where: { deviceId: input.deviceId, tmdbMovieId: input.tmdbMovieId },
      });
      return { ok: true };
    }),

  getReminders: publicProcedure
    .input(GetRemindersInputSchema)
    .query(async ({ input, ctx }) => {
      return ctx.db.reminder.findMany({
        where: { deviceId: input.deviceId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getUpcomingMovies: publicProcedure
    .input(UpcomingMoviesInputSchema)
    .query(async ({ input }) => {
      return fetchUpcomingMovies(input.region ?? "DE");
    }),
});
