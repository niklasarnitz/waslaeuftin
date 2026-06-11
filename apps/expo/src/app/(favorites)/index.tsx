import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQueries } from "@tanstack/react-query";

import { MovieCard } from "@waslaeuftin/expo/components/movie-card";
import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useFavorites } from "@waslaeuftin/expo/utils/favorites";
import { groupCinemasByMovie } from "@waslaeuftin/expo/utils/group-movies";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";
import { normalizeToStartOfDay } from "@waslaeuftin/expo/utils/date";

export default function FavoritesIndex() {
  const router = useRouter();
  const primaryColor = usePrimaryColor();
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeToStartOfDay(new Date()));

  // Get favorited cinemas metadata (id, name, slug)
  const favorites = useFavorites();

  // Run queries in parallel for each favorite cinema
  const cinemaQueries = useQueries({
    queries: favorites.map((cinema) =>
      trpc.cinemas.getCinemaBySlug.queryOptions({
        cinemaSlug: cinema.slug,
        date: selectedDate,
      }),
    ),
  });

  const isLoading = cinemaQueries.some((q) => q.isLoading);

  const loadedCinemas = React.useMemo(() => {
    return cinemaQueries
      .map((q) => q.data)
      .filter((data): data is NonNullable<typeof data> => !!data);
  }, [cinemaQueries]);

  const groupedMovies = React.useMemo(() => {
    return groupCinemasByMovie(loadedCinemas);
  }, [loadedCinemas]);

  const handleNavigateToSearch = () => {
    router.push("/(search)");
  };

  return (
    <View className="bg-background flex-1">
      {/* Date Picker Bar */}
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {favorites.length === 0 ? (
        // Empty state
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <View className="bg-muted h-16 w-16 items-center justify-center rounded-full">
            <SymbolView name="star" tintColor="#8E8E93" size={32} />
          </View>
          <View className="items-center">
            <Text className="text-foreground text-lg font-bold tracking-tight">
              Noch keine Favoriten
            </Text>
            <Text className="text-muted-foreground mt-1 max-w-[260px] text-center text-xs leading-relaxed">
              Markiere deine Lieblingskinos mit einem Stern, um deren Spielplan
              hier schnell einzusehen.
            </Text>
          </View>
          <Pressable
            onPress={handleNavigateToSearch}
            className="rounded-xl px-5 py-3"
            style={{ borderCurve: "continuous", backgroundColor: primaryColor }}
          >
            <Text className="text-sm font-bold text-white">Kinos suchen</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
          <Text className="text-muted-foreground mt-2 text-xs font-medium">
            Lade Lieblingskinos...
          </Text>
        </View>
      ) : groupedMovies.length > 0 ? (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={groupedMovies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
            />
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-foreground text-base font-semibold">
            Keine Filme gefunden
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs">
            Für das ausgewählte Datum wurden in deinen Lieblingskinos keine Vorstellungen gefunden.
          </Text>
        </View>
      )}
    </View>
  );
}
