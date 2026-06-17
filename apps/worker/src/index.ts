import cron from "node-cron";

import { runReminderMatching } from "@waslaeuftin/api/internal/notifications/runReminderMatching";
import { db } from "@waslaeuftin/db";
import { createExpoPushSender } from "@waslaeuftin/worker/expoPushSender";

// How often the matching job runs. Override with WORKER_CRON.
const CRON_SCHEDULE = process.env.WORKER_CRON ?? "*/30 * * * *";

const sender = createExpoPushSender();

const runOnce = async () => {
  const startedAt = new Date();
  try {
    const result = await runReminderMatching(db, sender);
    console.log(
      `[reminder-worker] ${startedAt.toISOString()} — checked ${result.candidates} reminder(s), notified ${result.matched}.`,
    );
  } catch (error) {
    console.error("[reminder-worker] run failed:", error);
  }
};

const main = async () => {
  // Run immediately on boot so a freshly-deployed worker catches up.
  await runOnce();

  // `--once` mode is used for manual/CI invocations and verification.
  if (process.argv.includes("--once")) {
    await db.$disconnect();
    return;
  }

  cron.schedule(CRON_SCHEDULE, () => void runOnce());
  console.log(`[reminder-worker] scheduled with "${CRON_SCHEDULE}".`);
};

void main();
