import { useEffect } from "react";

import type { RouterInputs } from "@waslaeuftin/expo/utils/api";
import { apiClient } from "@waslaeuftin/expo/utils/api";

type MobileAnalyticsEvent = RouterInputs["analytics"]["trackMobileEvent"];

export const trackMobileEvent = (event: MobileAnalyticsEvent) => {
  if (__DEV__) {
    return;
  }

  void apiClient.analytics.trackMobileEvent
    .mutate(event)
    .catch((error) => console.error("Failed to track analytics event", error));
};

export const useTrackMobileScreen = (
  screen: NonNullable<MobileAnalyticsEvent["screen"]>,
) => {
  useEffect(() => {
    trackMobileEvent({ name: "mobile-screen-viewed", screen });
  }, [screen]);
};
