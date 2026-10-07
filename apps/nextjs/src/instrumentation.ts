// Runs once when the Next.js server process boots. The jobs live in a separate
// module that is only imported for the Node.js runtime, so the Edge build of
// this file never bundles Node-only code (node-cron, Prisma, node:crypto, ...).
export async function register() {
  // Disable workers when previewing against a read-only production database.
  if (process.env.BACKGROUND_JOBS_ENABLED === "false") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeJobs } =
      await import("@waslaeuftin/instrumentation-node");
    await registerNodeJobs();
  }
}
