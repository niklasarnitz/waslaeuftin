import type { ExpoPushMessage } from "expo-server-sdk";
import { Expo } from "expo-server-sdk";

import type {
  PushSender,
  ReminderPushMessage,
} from "@waslaeuftin/api/internal/notifications/runReminderMatching";

// Adapter that fulfils the API package's `PushSender` interface using the
// Expo push service. Invalid/unregistered tokens are logged and skipped.
export const createExpoPushSender = (): PushSender => {
  const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

  return {
    async send(reminderMessages: ReminderPushMessage[]) {
      const messages: ExpoPushMessage[] = [];
      for (const message of reminderMessages) {
        if (!Expo.isExpoPushToken(message.to)) {
          console.warn(
            `Skipping invalid Expo push token: ${String(message.to)}`,
          );
          continue;
        }
        messages.push({
          to: message.to,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: "default",
        });
      }

      if (messages.length === 0) return;

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          for (const ticket of tickets) {
            if (ticket.status === "error") {
              console.error("Expo push error:", ticket.message, ticket.details);
            }
          }
        } catch (error) {
          console.error("Failed to send push chunk:", error);
        }
      }
    },
  };
};
