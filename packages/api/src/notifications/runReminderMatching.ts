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

  const messages: ReminderPushMessage[] = [];
  const matchedReminderIds: number[] = [];

  for (const reminder of reminders) {
    const token = reminder.device.expoPushToken;
    const cinemaIds = reminder.device.cinemaPopularity.map(
      (entry) => entry.cinemaId,
    );
    if (!token || cinemaIds.length === 0) {
      continue;
    }

    const showing = await db.showing.findFirst({
      where: {
        dateTime: { gte: now, lte: fourDaysFromNow },
        cinemaId: { in: cinemaIds },
        movie: { tmdbMovieId: reminder.tmdbMovieId },
      },
      orderBy: { dateTime: "asc" },
      include: { cinema: { select: { name: true } } },
    });

    if (!showing) {
      continue;
    }

    messages.push({
      to: token,
      title: `🎬 ${reminder.title} läuft jetzt in deiner Nähe`,
      body: `${reminder.title} wird im ${showing.cinema.name} gezeigt. Tippe für Vorstellungen in deiner Nähe.`,
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
