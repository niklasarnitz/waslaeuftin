import { Pressable, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";

import type { Showing } from "@waslaeuftin/expo/utils/group-movies";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

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
  const primaryColor = usePrimaryColor();
  const primaryBg = `${primaryColor}1a`;
  const primaryBorder = `${primaryColor}33`;

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
      className="flex-row items-center gap-1.5 rounded-xl border py-2.5"
      style={{ backgroundColor: primaryBg, borderColor: primaryBorder, paddingHorizontal: 12 }}
    >
      {/* Time — text-sm */}
      <Text className="text-sm font-bold" style={{ color: primaryColor }}>
        {timeStr}
      </Text>
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
