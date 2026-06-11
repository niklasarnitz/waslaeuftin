import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";

import { CinemaCard } from "@waslaeuftin/expo/components/cinema-card";
import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { trpc } from "@waslaeuftin/expo/utils/api";
import {
  favoritesStore,
  useIsFavorite,
} from "@waslaeuftin/expo/utils/favorites";

export default function CinemaScreen() {
  const navigation = useNavigation();
  const { cinemaSlug } = useLocalSearchParams<{ cinemaSlug: string }>();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch cinema schedule and info
  const cinemaQuery = useQuery(
    trpc.cinemas.getCinemaBySlug.queryOptions({
      cinemaSlug,
      date: selectedDate,
    }),
  );

  const cinema = cinemaQuery.data;
  const isFav = useIsFavorite(cinema?.id ?? -1);

  // Set title and favorite button dynamically
  useEffect(() => {
    if (cinema) {
      navigation.setOptions({
        title: cinema.name,
        headerRight: () => (
          <Pressable
            onPress={() =>
              favoritesStore.toggle({
                id: cinema.id,
                name: cinema.name,
                slug: cinema.slug,
              })
            }
            className="mr-1 p-2 active:opacity-60"
          >
            <SymbolView
              name={isFav ? "star.fill" : "star"}
              tintColor={isFav ? "#EAB308" : "#8E8E93"}
              size={22}
            />
          </Pressable>
        ),
      });
    }
  }, [cinema, isFav, navigation]);

  const isLoading = cinemaQuery.isLoading;

  return (
    <View className="bg-background flex-1">
      {/* Date Picker Bar */}
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#c03484" size="large" />
        </View>
      ) : cinema ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Reuse CinemaCard with header hidden since it's displayed in the native Stack navbar */}
          <CinemaCard cinema={cinema} hideHeader={true} />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-foreground text-base font-semibold">
            Kino nicht gefunden
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs">
            Das angeforderte Kino oder der Spielplan konnte nicht geladen
            werden.
          </Text>
        </View>
      )}
    </View>
  );
}
