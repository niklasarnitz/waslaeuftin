// Node.js-only part of src/instrumentation.ts. We schedule the reminder
// matching job and the nightly movie updates here (node-cron) so no separate
// worker service is needed — the crons live inside the already-deployed,
// long-running Next.js server.
//
// Requires a persistent server (`next start` / self-hosted), which is the case
// for the Coolify/Docker deployment.

// How often the matching job runs. Override with WORKER_CRON.
const CRON_SCHEDULE = process.env.WORKER_CRON ?? "*/30 * * * *";

// When the nightly movie updates run (Europe/Berlin). Override with
// MOVIE_UPDATE_CRON, or set it to "off" to disable them (e.g. in development).
const MOVIE_UPDATE_CRON = process.env.MOVIE_UPDATE_CRON || "0 3 * * *";
const MOVIE_UPDATE_TIMEZONE = "Europe/Berlin";

// Guard against double-scheduling across HMR reloads / repeated registration.
const globalForCron = globalThis as unknown as {
  reminderCronStarted?: boolean;
};

export async function registerNodeJobs() {
  if (globalForCron.reminderCronStarted) return;
  globalForCron.reminderCronStarted = true;

  const cron = (await import("node-cron")).default;
  const { runReminderMatching } =
    await import("@waslaeuftin/api/internal/notifications/runReminderMatching");
  const { db } = await import("@waslaeuftin/db");
  const { createExpoPushSender } =
    await import("@waslaeuftin/helpers/notifications/expoPushSender");

  const sender = createExpoPushSender();

  const runOnce = async () => {
    try {
      const result = await runReminderMatching(db, sender);
      if (result.matched > 0) {
        console.log(
          `[reminder-cron] notified ${result.matched}/${result.candidates} reminder(s).`,
        );
      }
    } catch (error) {
      console.error("[reminder-cron] run failed:", error);
    }
  };

  cron.schedule(CRON_SCHEDULE, () => void runOnce());
  console.log(`[reminder-cron] scheduled with "${CRON_SCHEDULE}".`);

  await scheduleMovieUpdates(cron);
}

async function scheduleMovieUpdates(
  cron: (typeof import("node-cron"))["default"],
) {
  const { errorToString, failInterruptedRuns, startProviderUpdates } =
    await import("@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner");
  const { sendPushoverNotification } =
    await import("@waslaeuftin/helpers/notifications/sendPushoverNotification");

  try {
    const failed = await failInterruptedRuns({ serverBoot: true });
    if (failed > 0) {
      console.warn(
        `[movie-update-cron] marked ${failed} interrupted run(s) as failed.`,
      );
    }
  } catch (error) {
    console.error("[movie-update-cron] could not clean up runs:", error);
    await sendPushoverNotification(
      "Movie Update Setup Failed",
      `Could not clean up interrupted update runs on server start:\n${errorToString(error)}`,
    );
  }

  if (MOVIE_UPDATE_CRON === "off") {
    console.log("[movie-update-cron] disabled.");
    return;
  }

  cron.schedule(
    MOVIE_UPDATE_CRON,
    async () => {
      try {
        const result = await startProviderUpdates({ trigger: "cron" });
        if (result.started) {
          console.log(`[movie-update-cron] started batch ${result.batchId}.`);
        } else {
          console.warn(`[movie-update-cron] skipped: ${result.reason}`);
          await sendPushoverNotification(
            "Movie Update Skipped",
            `The scheduled movie update did not start: ${result.reason}`,
          );
        }
      } catch (error) {
        console.error("[movie-update-cron] could not start updates:", error);
        await sendPushoverNotification(
          "Movie Update Failed",
          `The scheduled movie update could not be started:\n${errorToString(error)}`,
        );
      }
    },
    { timezone: MOVIE_UPDATE_TIMEZONE, name: "movie-updates" },
  );
  console.log(
    `[movie-update-cron] scheduled with "${MOVIE_UPDATE_CRON}" (${MOVIE_UPDATE_TIMEZONE}).`,
  );
}
