// Runs once when the Next.js server process boots. We schedule the reminder
// matching job here (node-cron) so no separate worker service is needed — the
// cron lives inside the already-deployed, long-running Next.js server.
//
// Requires a persistent server (`next start` / self-hosted), which is the case
// for the Coolify/Docker deployment.

// How often the matching job runs. Override with WORKER_CRON.
const CRON_SCHEDULE = process.env.WORKER_CRON ?? "*/30 * * * *";

// Guard against double-scheduling across HMR reloads / repeated registration.
const globalForCron = globalThis as unknown as { reminderCronStarted?: boolean };

export async function register() {
  // Only run in the Node.js server runtime (not edge, not the browser).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalForCron.reminderCronStarted) return;
  globalForCron.reminderCronStarted = true;

  const cron = (await import("node-cron")).default;
  const { runReminderMatching } = await import(
    "@waslaeuftin/api/internal/notifications/runReminderMatching"
  );
  const { db } = await import("@waslaeuftin/db");
  const { createExpoPushSender } = await import(
    "@waslaeuftin/helpers/notifications/expoPushSender"
  );

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
}
