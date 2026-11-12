import { Alert, Pressable, Share, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { ListingShowing as Showing } from "@waslaeuftin/core";
import { categorizeShowingTags, formatTime } from "@waslaeuftin/core";
import { AppIcon } from "@waslaeuftin/expo/components/app-icon";
import { openExternalUrl } from "@waslaeuftin/expo/utils/open-url";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface ShowingTimePillProps {
  showing: Showing;
  titleTags?: string[];
  movieName?: string;
  cinemaName?: string;
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
  const primaryColor = usePrimaryColor();
  // In the cinema's time zone, not the device's.
  const timeStr = formatTime(showing.dateTime, showing.timeZone);
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
          timeZone: showing.timeZone,
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
    <View className="flex-row items-center">
      <Pressable
        onPress={() => openBooking(showing.bookingUrl ?? null)}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${timeStr} Uhr${prominentTags.length ? `, ${prominentTags.join(", ")}` : ""}`}
        accessibilityHint="Tippen, um Tickets zu öffnen. Gedrückt halten, um die Vorstellung zu teilen."
        style={{ minHeight: 44, flexShrink: 1, alignContent: "center" }}
        className="relative flex-row flex-wrap items-center justify-center gap-1.5 px-3 py-2 active:opacity-75"
      >
        <View
          pointerEvents="none"
          className="bg-primary/10"
          style={{
            position: "absolute",
            top: 6,
            bottom: 6,
            left: 0,
            right: 0,
            borderRadius: 10,
          }}
        />
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
      </Pressable>
      {infoItems.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vorstellungsinformationen"
          onPress={() => {
            Alert.alert(
              "Vorstellungsinformationen",
              infoItems.map((item) => `• ${item}`).join("\n"),
              [{ text: "OK" }],
            );
          }}
          style={{ minHeight: 44, minWidth: 44 }}
          className="items-center justify-center active:opacity-70"
        >
          <AppIcon name="info.circle" size={16} color={primaryColor} />
        </Pressable>
      )}
    </View>
  );
}
