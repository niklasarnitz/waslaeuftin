import { Alert, Pressable, Share, Text } from "react-native";
import * as Haptics from "expo-haptics";

import {
  categorizeShowingTags,
  type ListingShowing as Showing,
} from "@waslaeuftin/core";
import { openExternalUrl } from "@waslaeuftin/expo/utils/open-url";

interface ShowingTimePillProps {
  showing: Showing;
  titleTags?: string[];
  movieName?: string;
  cinemaName?: string;
}

function formatTime(dateTimeStr: Date | string) {
  const d = dateTimeStr instanceof Date ? dateTimeStr : new Date(dateTimeStr);
  if (isNaN(d.getTime())) return "??:??";
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function openBooking(url: string | null) {
  await openExternalUrl(url);
}

export function ShowingTimePill({
  showing,
  titleTags,
  movieName,
  cinemaName,
}: ShowingTimePillProps) {
  const timeStr = formatTime(showing.dateTime);
  const { prominentTags, infoItems } = categorizeShowingTags(
    titleTags ?? [],
    showing.showingAdditionalData,
  );

  const handleLongPress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const d =
      showing.dateTime instanceof Date
        ? showing.dateTime
        : new Date(showing.dateTime);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("de-DE", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        })
      : "";
    const movieTitle = movieName ? `„${movieName}“` : "dieser Film";
    const cinemaLoc = cinemaName ? ` im ${cinemaName}` : "";
    const dateInfo = dateStr ? ` am ${dateStr}` : "";
    const shareText = `Lust auf Kino? 🎬\n${movieTitle}${dateInfo} um ${timeStr} Uhr${cinemaLoc}!${
      showing.bookingUrl ? `\n\nTickets buchen: ${showing.bookingUrl}` : ""
    }`;

    try {
      await Share.share({
        message: shareText,
        title: `${movieName ?? "Kino-Vorstellung"} teilen`,
      });
    } catch (err) {
      console.error("Failed to share showing:", err);
    }
  };

  return (
    <Pressable
      onPress={() => openBooking(showing.bookingUrl ?? null)}
      onLongPress={handleLongPress}
      delayLongPress={350}
      className="bg-primary/10 border-primary/20 flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5 active:opacity-75"
    >
      {/* Time — text-sm */}
      <Text className="text-primary text-sm font-bold">{timeStr}</Text>
      {prominentTags.map((tag) => {
        let badgeStyle = "bg-primary/20 text-primary";
        if (["OV", "OmU", "OmeU", "OmEU"].includes(tag)) {
          badgeStyle =
            "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400";
        } else if (["3D"].includes(tag)) {
          badgeStyle =
            "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400";
        } else if (["70mm", "35mm", "IMAX", "IMAX 3D"].includes(tag)) {
          badgeStyle =
            "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400";
        }

        return (
          <Text
            key={`expo-tag-${showing.id}-${tag}`}
            className={`rounded-md px-1.5 py-0.5 text-xs font-black uppercase ${badgeStyle}`}
          >
            {tag}
          </Text>
        );
      })}
      {infoItems.length > 0 && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Alert.alert(
              "Vorstellungsinformationen",
              infoItems.map((item) => `• ${item}`).join("\n"),
              [{ text: "OK" }],
            );
          }}
          className="border-border/60 bg-muted/40 ml-0.5 flex h-4 w-4 items-center justify-center rounded-full border"
          hitSlop={8}
        >
          <Text className="text-muted-foreground text-[10px] font-bold italic">
            i
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}
