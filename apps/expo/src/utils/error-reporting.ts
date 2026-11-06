import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

import { sanitizeErrorEvent } from "@waslaeuftin/core/errorReporting";

if (!__DEV__ && process.env.EXPO_PUBLIC_BUGSINK_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_BUGSINK_DSN,
    defaultIntegrations: false,
    integrations: [Sentry.reactNativeErrorHandlersIntegration()],
    // Native crash files bypass JS beforeSend: leave native reporting disabled.
    enableNative: false,
    enableNativeCrashHandling: false,
    autoInitializeNativeSdk: false,
    enableNativeNagger: false,
    enableNdk: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableCaptureFailedRequests: false,
    enableWatchdogTerminationTracking: false,
    sendDefaultPii: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    attachStacktrace: false,
    sendClientReports: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeErrorEvent(
        event,
        "mobile",
        `waslaeuftin-mobile@${Constants.expoConfig?.version ?? "unknown"}`,
      ),
  });
}
