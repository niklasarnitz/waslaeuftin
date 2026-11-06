// Runs once when the Next.js server process boots. The jobs live in a separate
// module that is only imported for the Node.js runtime, so the Edge build of
// this file never bundles Node-only code (node-cron, Prisma, node:crypto, ...).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerErrorReporting } =
      await import("@waslaeuftin/helpers/errorReporting");
    registerErrorReporting();
  }

  // Disable workers when previewing against a read-only production database.
  if (process.env.BACKGROUND_JOBS_ENABLED === "false") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeJobs } =
      await import("@waslaeuftin/instrumentation-node");
    await registerNodeJobs();
  }
}

// Do not pass request headers, URLs or parameters to the reporting SDK.
export const onRequestError: import("next").Instrumentation.onRequestError =
  async (error) => {
    if (process.env.NODE_ENV !== "production" || !process.env.BUGSINK_DSN)
      return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error);
    await Sentry.flush(2000);
  };
