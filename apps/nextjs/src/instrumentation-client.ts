import * as Sentry from "@sentry/nextjs";

import { sanitizeErrorEvent } from "@waslaeuftin/core/errorReporting";

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_BUGSINK_DSN &&
  navigator.doNotTrack !== "1" &&
  !(
    "globalPrivacyControl" in navigator &&
    navigator.globalPrivacyControl === true
  )
) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_BUGSINK_DSN,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration()],
    sendDefaultPii: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    sendClientReports: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeErrorEvent(
        event,
        "browser",
        process.env.NEXT_PUBLIC_BUGSINK_RELEASE,
      ),
  });
}
