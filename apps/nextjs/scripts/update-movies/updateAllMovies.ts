// Runs the provider updates in this process. In production the same updates
// run nightly inside the Next.js server (see src/instrumentation.ts); every run
// is tracked in the ProviderUpdateRun table and visible on /admin.
//
// Usage: bun run update:movies:all [ProviderName ...]
import { db } from "@waslaeuftin/db/client";
import { providerNames } from "@waslaeuftin/helpers/catalogUpdater/providerFetchers";
import {
  errorToString,
  runProviderUpdates,
} from "@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner";
import { sendPushoverNotification } from "@waslaeuftin/helpers/notifications/sendPushoverNotification";

const requestedProviders = process.argv.slice(2);

try {
  const { failedProviders } = await runProviderUpdates({
    providers: requestedProviders,
  });

  if (failedProviders.length > 0) {
    console.error(`Failed providers: ${failedProviders.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.info("Update finished successfully.");
  }
} catch (err) {
  console.error("Critical error during update:", err);
  await sendPushoverNotification(
    "Movie Update Failed",
    `Critical error during update:\n${errorToString(err)}`,
  );
  console.info(`Available providers: ${providerNames.join(", ")}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
