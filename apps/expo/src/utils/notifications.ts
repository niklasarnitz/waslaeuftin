import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

// Show banners while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

const getProjectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

/**
 * Requests notification permission and returns the device's Expo push token.
 * Returns `null` (without throwing) when permission is denied or no EAS
 * projectId is configured, so the rest of the feature degrades gracefully.
 */
export const registerForPushNotificationsAsync = async (): Promise<
  string | null
> => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Erinnerungen",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const granted = Notifications.PermissionStatus.GRANTED;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (existingStatus !== granted) {
    const request = await Notifications.requestPermissionsAsync();
    status = request.status;
  }
  if (status !== granted) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Missing EAS projectId — skipping Expo push token.");
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error("Failed to obtain Expo push token", error);
    return null;
  }
};

export interface ReminderNotificationData {
  type: "reminder";
  tmdbMovieId: number;
  movieName: string;
}

export const parseReminderNotificationData = (
  data: unknown,
): ReminderNotificationData | null => {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (record.type !== "reminder") return null;
  const tmdbMovieId = Number(record.tmdbMovieId);
  if (!Number.isFinite(tmdbMovieId)) return null;
  return {
    type: "reminder",
    tmdbMovieId,
    movieName: typeof record.movieName === "string" ? record.movieName : "Film",
  };
};
