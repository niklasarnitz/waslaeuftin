import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useQuery } from "@tanstack/react-query";

import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { MovieCard } from "@waslaeuftin/expo/components/movie-card";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { normalizeToStartOfDay } from "@waslaeuftin/expo/utils/date";
import { useFavoritesStore } from "@waslaeuftin/expo/utils/favorites";
import { groupCinemasByMovie } from "@waslaeuftin/expo/utils/group-movies";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function CinemaScreen() {
  const navigation = useNavigation();
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("cinema");
  const { cinemaSlug, name } = useLocalSearchParams<{
    cinemaSlug: string;
    name?: string;
  }>();

  const favoriteCinemaIds = useFavoritesStore((s) => s.favoriteCinemaIds);
  const toggleFavoriteCinema = useFavoritesStore((s) => s.toggleFavoriteCinema);

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeToStartOfDay(new Date()),
  );

  const cinemaQuery = useQuery(
    trpc.cinemas.getCinemaBySlug.queryOptions({
      cinemaSlug,
      date: selectedDate,
    }),
  );

  const cinema = cinemaQuery.data;
  const isFavorite = cinema ? favoriteCinemaIds.includes(cinema.id) : false;

  // Set title: immediately from name / slug, then from real data, and add favorite button
  useEffect(() => {
    if (!cinemaSlug) return;
    const initial =
      name ??
      cinemaSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    navigation.setOptions({
      title: cinema?.name ?? initial,
      headerRight: cinema
        ? () => (
            <Pressable
              onPress={() => toggleFavoriteCinema(cinema.id)}
              hitSlop={12}
              className="p-1"
            >
              {Platform.OS === "ios" ? (
                <SymbolView
                  name={isFavorite ? "star.fill" : "star"}
                  tintColor={primaryColor}
                  size={22}
                />
              ) : (
                <Ionicons
                  name={isFavorite ? "star" : "star-outline"}
                  color={primaryColor}
                  size={22}
                />
              )}
            </Pressable>
          )
        : undefined,
    });
  }, [
    cinema,
    cinemaSlug,
    name,
    navigation,
    isFavorite,
    toggleFavoriteCinema,
    primaryColor,
  ]);

  const groupedMovies = React.useMemo(() => {
    return cinema ? groupCinemasByMovie([cinema]) : [];
  }, [cinema]);

  const isLoading = cinemaQuery.isLoading;

  return (
    <View className="bg-background flex-1">
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : cinema ? (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
            />
          }
        >
          {groupedMovies.length > 0 ? (
            groupedMovies.map((movie) => (
              <MovieCard
                key={movie.name}
                movie={movie}
                hideCinemaHeader={true}
              />
            ))
          ) : (
            <View className="items-center justify-center py-8">
              <Text className="text-muted-foreground text-sm italic">
                Keine Vorstellungen für dieses Datum gefunden.
              </Text>
            </View>
          )}
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
