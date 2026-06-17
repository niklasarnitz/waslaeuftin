import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { apiClient } from "@waslaeuftin/expo/utils/api";
import {
  getOrCreateDeviceId,
  useDeviceStore,
} from "@waslaeuftin/expo/utils/device";
import {
  parseReminderNotificationData,
  registerForPushNotificationsAsync,
} from "@waslaeuftin/expo/utils/notifications";

/**
 * On startup: ensures the anonymous device id exists, obtains a push token (if
 * permitted), and registers the device with the backend.
 */
export const useDeviceRegistration = () => {
  const setDeviceId = useDeviceStore((state) => state.setDeviceId);

  useEffect(() => {
    const state = { cancelled: false };

    void (async () => {
      const deviceId = await getOrCreateDeviceId();
      if (state.cancelled) return;
      setDeviceId(deviceId);

      const expoPushToken = await registerForPushNotificationsAsync();
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- guard can flip during the await
      if (state.cancelled) return;

      try {
        await apiClient.devices.registerDevice.mutate({
          deviceId,
          expoPushToken: expoPushToken ?? undefined,
        });
      } catch (error) {
        console.error("Failed to register device", error);
      }
    })();

    return () => {
      state.cancelled = true;
    };
  }, [setDeviceId]);
};

/**
 * Routes to the movie detail screen when a reminder notification is tapped,
 * handling both the foreground/background case and a cold start from a tap.
 */
export const useNotificationDeepLink = () => {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastResponse) return;

    const identifier = lastResponse.notification.request.identifier;
    if (handledRef.current === identifier) return;

    const reminder = parseReminderNotificationData(
      lastResponse.notification.request.content.data,
    );
    if (!reminder) return;

    handledRef.current = identifier;
    router.push({
      pathname: "/movie/[movieName]",
      params: {
        movieName: reminder.movieName,
        tmdbMovieId: String(reminder.tmdbMovieId),
      },
    });
  }, [lastResponse, router]);
};
