import { Pressable, Text, View } from "react-native";

import type { Cinema, Showing } from "@waslaeuftin/expo/utils/group-movies";
import { ShowingTimePill } from "@waslaeuftin/expo/components/showing-time-pill";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface CinemaShowingsCardProps {
  cinema: Cinema;
  showings: Showing[];
  hideCinemaHeader?: boolean;
  onCinemaPress?: () => void;
}

export function CinemaShowingsCard({
  cinema,
  showings,
  hideCinemaHeader = false,
  onCinemaPress,
}: CinemaShowingsCardProps) {
  const primaryColor = usePrimaryColor();
  return (
    <View
      className="border-border/20 bg-muted/30 rounded-xl border p-2.5"
      style={{ borderCurve: "continuous" }}
    >
      {!hideCinemaHeader && (
        <Pressable
          onPress={onCinemaPress}
          disabled={!onCinemaPress}
          className="mb-3 flex-row items-center justify-between"
        >
          <View className="mr-2 flex-1">
            <Text className="text-foreground text-sm font-bold tracking-tight">
              {cinema.name}
            </Text>
            {cinema.city && (
              <Text className="text-muted-foreground mt-0.5 text-xs">
                {cinema.city.name}
              </Text>
            )}
          </View>
          {cinema.distanceKm !== undefined && (
            <Text className="text-xs font-semibold" style={{ color: primaryColor }}>
              {cinema.distanceKm.toFixed(1)} km
            </Text>
          )}
        </Pressable>
      )}

      <View className="flex-row flex-wrap gap-1.5">
        {showings.map((showing, index) => (
          <ShowingTimePill
            key={`${showing.id}-${index}`}
            showing={showing}
          />
        ))}
      </View>
    </View>
  );
}
