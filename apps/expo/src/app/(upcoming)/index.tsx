import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";

import { UpcomingMovieCard } from "@waslaeuftin/expo/components/upcoming-movie-card";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useLocationStore } from "@waslaeuftin/expo/utils/location";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
import { useReminders } from "@waslaeuftin/expo/utils/use-reminders";

export default function UpcomingScreen() {
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("upcoming");
  const cachedCoords = useLocationStore((state) => state.cachedCoords);
  const [region, setRegion] = useState("DE");
  const { isReminded, toggle } = useReminders();

  // Derive the TMDB region from the user's position so the upcoming list is
  // localized (DE/AT). Falls back to "DE".
  useEffect(() => {
    if (!cachedCoords) return;
    const state = { cancelled: false };
    void (async () => {
      try {
        const results = await Location.reverseGeocodeAsync(cachedCoords);
        const iso = results[0]?.isoCountryCode;
        if (iso && !state.cancelled) setRegion(iso.toUpperCase());
      } catch (error) {
        console.error("Reverse geocode failed", error);
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [cachedCoords]);

  const upcomingQuery = useQuery(
    trpc.devices.getUpcomingMovies.queryOptions({ region }),
  );
  const movies = upcomingQuery.data ?? [];

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerStyle={{ padding: 16 }}
      data={movies}
      keyExtractor={(movie) => String(movie.tmdbMovieId)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primaryColor}
        />
      }
      renderItem={({ item }) => (
        <UpcomingMovieCard
          movie={{
            tmdbMovieId: item.tmdbMovieId,
            title: item.title,
            posterUrl: item.posterUrl,
            releaseDate: item.releaseDate,
            overview: item.overview,
          }}
          isReminded={isReminded(item.tmdbMovieId)}
          onToggleReminder={() =>
            toggle({
              tmdbMovieId: item.tmdbMovieId,
              title: item.title,
              posterPath: item.posterPath,
            })
          }
        />
      )}
      ListEmptyComponent={
        upcomingQuery.isLoading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator color={primaryColor} size="small" />
            <Text className="text-muted-foreground mt-2 text-xs font-medium">
              Lade kommende Filme...
            </Text>
          </View>
        ) : (
          <View className="bg-muted border-border/40 items-center justify-center rounded-xl border p-4">
            <Text className="text-muted-foreground text-xs italic">
              Aktuell keine kommenden Filme gefunden.
            </Text>
          </View>
        )
      }
    />
  );
}
