import type { GestureResponderEvent } from "react-native";
import { Image, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";

import {
  favoritesStore,
  useIsFavorite,
} from "@waslaeuftin/expo/utils/favorites";

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
  const isFav = useIsFavorite(cinema.id);

  const handleToggleFavorite = (e: GestureResponderEvent) => {
    e.stopPropagation();
    favoritesStore.toggle({
      id: cinema.id,
      name: cinema.name,
      slug: cinema.slug,
    });
  };

  const handleBooking = async (url: string | null) => {
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      } catch (err) {
        console.error("Failed to open browser", err);
      }
    }
  };

  const formatTime = (dateTimeStr: Date | string) => {
    const d = new Date(dateTimeStr);
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

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
        <View className="mb-3 flex-row items-start justify-between">
          <Pressable onPress={onCinemaPress} className="mr-4 flex-1">
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
                  <Text className="text-sm font-semibold text-[#c03484]">
                    {cinema.distanceKm.toFixed(1)} km entfernt
                  </Text>
                </>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={handleToggleFavorite}
            className="bg-muted/60 rounded-full p-1.5"
          >
            <SymbolView
              name={isFav ? "star.fill" : "star"}
              tintColor={isFav ? "#EAB308" : "#8E8E93"}
              size={20}
            />
          </Pressable>
        </View>
      )}

      {/* Movies & Screenings */}
      {cinema.movies.length > 0 ? (
        <View className="mt-2 gap-4">
          {cinema.movies.map((movie) => (
            <View key={movie.name} className="border-border/30 border-t pt-3">
              <View className="flex-row gap-3">
                {movie.coverUrl && (
                  <Image
                    source={{ uri: movie.coverUrl }}
                    className="bg-muted h-18 w-12 rounded-md"
                    resizeMode="cover"
                  />
                )}
                <View className="flex-1">
                  <Text
                    className="text-foreground text-base font-semibold"
                    numberOfLines={2}
                  >
                    {movie.name}
                  </Text>

                  {/* Showtimes List */}
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {movie.showings.map((showing) => {
                      const timeStr = formatTime(showing.dateTime);
                      const isOV = showing.showingAdditionalData.some(
                        (tag) =>
                          tag.toLowerCase() === "ov" ||
                          tag.toLowerCase() === "omu",
                      );
                      const is3D = showing.showingAdditionalData.some(
                        (tag) => tag.toLowerCase() === "3d",
                      );

                      return (
                        <Pressable
                          key={showing.id}
                          onPress={() => handleBooking(showing.bookingUrl)}
                          className="flex-row items-center gap-1 rounded-lg border border-[#c03484]/20 bg-[#c03484]/10 px-2.5 py-1.5 active:bg-[#c03484]/20"
                        >
                          <Text className="text-sm font-bold text-[#c03484]">
                            {timeStr}
                          </Text>
                          {isOV && (
                            <Text className="rounded bg-amber-100 px-1 text-[10px] font-black text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                              OV
                            </Text>
                          )}
                          {is3D && (
                            <Text className="rounded bg-cyan-100 px-1 text-[10px] font-black text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                              3D
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
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
