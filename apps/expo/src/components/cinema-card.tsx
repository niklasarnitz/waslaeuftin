import { Pressable, Text, View } from "react-native";

import { MoviePoster } from "@waslaeuftin/expo/components/movie-poster";
import { ShowingTimePill } from "@waslaeuftin/expo/components/showing-time-pill";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

interface Showing {
  id: number;
  dateTime: Date | string;
  bookingUrl: string | null;
  showingAdditionalData: string[];
}

interface Movie {
  name: string;
  coverUrl: string | null;
  showings: Showing[];
}

interface Cinema {
  id: number;
  name: string;
  slug: string;
  distanceKm?: number;
  city?: { name: string; slug: string };
  movies: Movie[];
}

interface CinemaCardProps {
  cinema: Cinema;
  onCinemaPress?: () => void;
  hideHeader?: boolean;
}

export function CinemaCard({
  cinema,
  onCinemaPress,
  hideHeader = false,
}: CinemaCardProps) {
  const primaryColor = usePrimaryColor();

  return (
    <View
      className="bg-card border-border/40 mb-4 rounded-2xl border p-4"
      style={{
        borderCurve: "continuous",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <Pressable onPress={onCinemaPress} className="mb-3">
          <Text className="text-foreground text-xl font-bold tracking-tight">
            {cinema.name}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            {cinema.city && (
              <Text className="text-muted-foreground text-sm font-medium">
                {cinema.city.name}
              </Text>
            )}
            {cinema.distanceKm !== undefined && (
              <>
                {cinema.city && (
                  <Text className="text-muted-foreground/60 text-xs">•</Text>
                )}
                <Text
                  className="text-sm font-semibold"
                  style={{ color: primaryColor }}
                >
                  {cinema.distanceKm.toFixed(1)} km entfernt
                </Text>
              </>
            )}
          </View>
        </Pressable>
      )}

      {/* Movies & Screenings */}
      {cinema.movies.length > 0 ? (
        <View className="mt-2 gap-4">
          {cinema.movies.map((movie, index) => (
            <View
              key={`${movie.name}-${index}`}
              className="border-border/30 border-t pt-3"
            >
              <View className="flex-row gap-3">
                <MoviePoster coverUrl={movie.coverUrl} size="sm" />
                <View className="flex-1">
                  <Text
                    className="text-foreground text-base font-semibold"
                    numberOfLines={2}
                  >
                    {movie.name}
                  </Text>

                  {/* Showtimes List */}
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {movie.showings.map((showing) => (
                      <ShowingTimePill key={showing.id} showing={showing} />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="border-border/30 border-t pt-3">
          <Text className="text-muted-foreground text-sm italic">
            Keine Vorstellungen für dieses Datum gefunden.
          </Text>
        </View>
      )}
    </View>
  );
}
