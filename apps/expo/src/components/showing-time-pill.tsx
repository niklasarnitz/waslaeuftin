import { Pressable, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";

import type { Showing } from "@waslaeuftin/expo/utils/group-movies";

interface ShowingTimePillProps {
  showing: Showing;
}

function formatTime(dateTimeStr: Date | string) {
  const d = dateTimeStr instanceof Date ? dateTimeStr : new Date(dateTimeStr);
  if (isNaN(d.getTime())) return "??:??";
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function openBooking(url: string | null) {
  if (!url) return;

  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
    });
  } catch (err) {
    console.error("Failed to open browser", err);
  }
}

export function ShowingTimePill({ showing }: ShowingTimePillProps) {
  const timeStr = formatTime(showing.dateTime);
  const isOV = showing.showingAdditionalData.some((tag) =>
    ["ov", "omu"].includes(tag.toLowerCase()),
  );
  const is3D = showing.showingAdditionalData.some(
    (tag) => tag.toLowerCase() === "3d",
  );

  return (
    <Pressable
      onPress={() => openBooking(showing.bookingUrl)}
      className="bg-primary/10 border-primary/20 flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5"
    >
      {/* Time — text-sm */}
      <Text className="text-primary text-sm font-bold">{timeStr}</Text>
      {isOV && (
        <Text className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-black text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          OV
        </Text>
      )}
      {is3D && (
        <Text className="rounded-md bg-cyan-100 px-1.5 py-0.5 text-xs font-black text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
          3D
        </Text>
      )}
    </Pressable>
  );
}
