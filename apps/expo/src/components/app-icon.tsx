import type { TextStyle, ViewStyle } from "react-native";
import { Platform } from "react-native";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";

export type IconName =
  | "star"
  | "star.fill"
  | "location"
  | "location.fill"
  | "mappin.circle.fill"
  | "slider.horizontal.3"
  | "arrow.up.arrow.down"
  | "info.circle"
  | "film"
  | "film.fill"
  | "magnifyingglass"
  | "chevron.right"
  | "play"
  | "calendar"
  | "bell"
  | "bell.fill"
  | "trash"
  | "xmark"
  | "checkmark";

const SF_TO_IONICONS_MAP: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  star: "star-outline",
  "star.fill": "star",
  location: "location-outline",
  "location.fill": "location",
  "mappin.circle.fill": "location",
  "slider.horizontal.3": "options-outline",
  "arrow.up.arrow.down": "swap-vertical",
  "info.circle": "information-circle-outline",
  film: "videocam-outline",
  "film.fill": "videocam",
  magnifyingglass: "search",
  "chevron.right": "chevron-forward",
  play: "play",
  calendar: "calendar-outline",
  bell: "notifications-outline",
  "bell.fill": "notifications",
  trash: "trash-outline",
  xmark: "close",
  checkmark: "checkmark",
};

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  tintColor?: string;
  style?: ViewStyle & TextStyle;
}

export function AppIcon({
  name,
  size = 20,
  color,
  tintColor,
  style,
}: AppIconProps) {
  const iconColor = color ?? tintColor ?? "#000";

  if (Platform.OS === "ios") {
    return (
      <SymbolView name={name} tintColor={iconColor} size={size} style={style} />
    );
  }

  const ioniconName = SF_TO_IONICONS_MAP[name];
  return (
    <Ionicons name={ioniconName} size={size} color={iconColor} style={style} />
  );
}
