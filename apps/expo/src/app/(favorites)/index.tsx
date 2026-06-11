import { useState } from "react";
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

import { CinemaCard } from "@waslaeuftin/expo/components/cinema-card";
import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useFavorites } from "@waslaeuftin/expo/utils/favorites";

export default function FavoritesIndex() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const handleCinemaPress = (cinemaSlug: string) => {
    router.push(`/cinema/${cinemaSlug}`);
  };

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
            className="rounded-xl bg-[#c03484] px-5 py-3 active:bg-[#c03484]/80"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-sm font-bold text-white">Kinos suchen</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item, index }) => {
            const query = cinemaQueries[index];

            if (query?.isLoading) {
              return (
                <View
                  className="bg-card border-border/40 min-h-[120px] items-center justify-center rounded-2xl border p-4"
                  style={{ borderCurve: "continuous" }}
                >
                  <ActivityIndicator color="#c03484" size="small" />
                  <Text className="text-muted-foreground mt-2 text-xs font-medium">
                    Lade {item.name}...
                  </Text>
                </View>
              );
            }

            if (query?.data) {
              // Merge the calculated distance if available (though not stored, the query returns full details)
              return (
                <CinemaCard
                  cinema={query.data}
                  onCinemaPress={() => handleCinemaPress(item.slug)}
                />
              );
            }

            return (
              <View
                className="bg-card border-border/40 rounded-2xl border p-4"
                style={{ borderCurve: "continuous" }}
              >
                <Text className="text-foreground text-base font-bold">
                  {item.name}
                </Text>
                <Text className="text-destructive mt-1 text-xs">
                  Fehler beim Laden des Spielplans.
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
