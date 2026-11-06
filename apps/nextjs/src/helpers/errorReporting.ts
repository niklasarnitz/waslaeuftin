import * as Sentry from "@sentry/nextjs";

import { sanitizeErrorEvent } from "@waslaeuftin/core/errorReporting";

export function registerErrorReporting() {
  if (process.env.NODE_ENV !== "production" || !process.env.BUGSINK_DSN) return;

  Sentry.init({
    dsn: process.env.BUGSINK_DSN,
    defaultIntegrations: false,
    integrations: [
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
    skipOpenTelemetrySetup: true,
    sendDefaultPii: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    sendClientReports: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeErrorEvent(event, "server", process.env.BUGSINK_RELEASE),
  });
}
