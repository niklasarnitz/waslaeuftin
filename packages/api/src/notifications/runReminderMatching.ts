import type { db as prismaDb } from "@waslaeuftin/db";

type DbClient = typeof prismaDb;

export interface ReminderPushMessage {
  to: string;
  title: string;
  body: string;
  data: {
    type: "reminder";
    tmdbMovieId: number;
    movieName: string;
  };
}

/**
 * Sends a batch of push messages. Implemented by the worker (which owns the
 * `expo-server-sdk` dependency) so this package stays runtime-agnostic.
 */
export interface PushSender {
  send(messages: ReminderPushMessage[]): Promise<void>;
}

export interface ReminderMatchingResult {
  candidates: number;
  matched: number;
}

/**
 * Finds reminders whose movie now has a future showing at one of the device's
 * top cinemas, sends a push for each, and marks them as notified so they are
 * not sent again.
 */
export const runReminderMatching = async (
  db: DbClient,
  sender: PushSender,
): Promise<ReminderMatchingResult> => {
  const now = new Date();
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const reminders = await db.reminder.findMany({
    where: {
      notifiedAt: null,
      device: { expoPushToken: { not: null } },
    },
    include: {
      device: {
        select: {
          expoPushToken: true,
          cinemaPopularity: { select: { cinemaId: true } },
        },
      },
    },
  });

  // Collect all unique tmdbMovieIds and cinemaIds across candidate reminders
  const candidateReminders = reminders.filter((r) => {
    const token = r.device.expoPushToken;
    const cinemaIds = r.device.cinemaPopularity.map((e) => e.cinemaId);
    return Boolean(token && cinemaIds.length > 0);
  });

  if (candidateReminders.length === 0) {
    return { candidates: reminders.length, matched: 0 };
  }

  const allTmdbMovieIds = Array.from(
    new Set(candidateReminders.map((r) => r.tmdbMovieId)),
  );
  const allCinemaIds = Array.from(
    new Set(
      candidateReminders.flatMap((r) =>
        r.device.cinemaPopularity.map((e) => e.cinemaId),
      ),
    ),
  );

  // Fetch all matching future showings in a single query
  const matchingShowings = await db.showing.findMany({
    where: {
      dateTime: { gte: now, lte: fourDaysFromNow },
      cinemaId: { in: allCinemaIds },
      movie: { tmdbMovieId: { in: allTmdbMovieIds } },
    },
    orderBy: { dateTime: "asc" },
    include: {
      cinema: { select: { name: true } },
      movie: { select: { tmdbMovieId: true } },
    },
  });

  // Map of "${cinemaId}:${tmdbMovieId}" -> earliest showing
  const earliestShowingMap = new Map<
    string,
    (typeof matchingShowings)[number]
  >();
  for (const showing of matchingShowings) {
    const tmdbId = showing.movie.tmdbMovieId;
    if (!tmdbId) continue;
    const key = `${showing.cinemaId}:${tmdbId}`;
    if (!earliestShowingMap.has(key)) {
      earliestShowingMap.set(key, showing);
    }
  }

  const messages: ReminderPushMessage[] = [];
  const matchedReminderIds: number[] = [];

  for (const reminder of candidateReminders) {
    const token = reminder.device.expoPushToken!;
    const cinemaIds = reminder.device.cinemaPopularity.map(
      (entry) => entry.cinemaId,
    );

    // Find the earliest showing across the device's favorite/nearby cinemas
    let bestShowing: (typeof matchingShowings)[number] | undefined;
    for (const cinemaId of cinemaIds) {
      const candidate = earliestShowingMap.get(
        `${cinemaId}:${reminder.tmdbMovieId}`,
      );
      if (candidate) {
        if (
          !bestShowing ||
          candidate.dateTime.getTime() < bestShowing.dateTime.getTime()
        ) {
          bestShowing = candidate;
        }
      }
    }

    if (!bestShowing) {
      continue;
    }

    messages.push({
      to: token,
      title: `🎬 ${reminder.title} läuft jetzt in deiner Nähe`,
      body: `${reminder.title} wird im ${bestShowing.cinema.name} gezeigt. Tippe für Vorstellungen in deiner Nähe.`,
      data: {
        type: "reminder",
        tmdbMovieId: reminder.tmdbMovieId,
        movieName: reminder.title,
      },
    });
    matchedReminderIds.push(reminder.id);
  }

  if (messages.length > 0) {
    await sender.send(messages);
    await db.reminder.updateMany({
      where: { id: { in: matchedReminderIds } },
      data: { notifiedAt: now },
    });
  }

  return { candidates: reminders.length, matched: matchedReminderIds.length };
};
