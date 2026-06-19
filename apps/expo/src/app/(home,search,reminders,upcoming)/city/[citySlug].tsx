import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { DatePickerBar } from "@waslaeuftin/expo/components/date-picker-bar";
import { MovieCard } from "@waslaeuftin/expo/components/movie-card";
import { useTrackMobileScreen } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { normalizeToStartOfDay } from "@waslaeuftin/expo/utils/date";
import { groupCinemasByMovie } from "@waslaeuftin/expo/utils/group-movies";
import { useRefresh } from "@waslaeuftin/expo/utils/refresh";
import { usePrimaryColor } from "@waslaeuftin/expo/utils/theme";

export default function CityScreen() {
  const navigation = useNavigation();
  const primaryColor = usePrimaryColor();
  const { refreshing, onRefresh } = useRefresh();
  useTrackMobileScreen("city");
  const { citySlug } = useLocalSearchParams<{ citySlug: string }>();

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    normalizeToStartOfDay(new Date()),
  );

  // Fetch movies and showings for the city
  const cityQuery = useQuery(
    trpc.cities.getCityMoviesAndShowingsBySlug.queryOptions({
      slug: citySlug,
      date: selectedDate,
    }),
  );

  // Set the screen title: immediately from the slug, then from real data
  useEffect(() => {
    const initial = citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    navigation.setOptions({ title: cityQuery.data?.name ?? initial });
  }, [cityQuery.data?.name, citySlug, navigation]);

  const groupedMovies = React.useMemo(() => {
    return cityQuery.data?.cinemas
      ? groupCinemasByMovie(cityQuery.data.cinemas)
      : [];
  }, [cityQuery.data]);

  const isLoading = cityQuery.isLoading;

  return (
    <View className="bg-background flex-1">
      {/* Date Picker Bar */}
      <DatePickerBar selectedDate={selectedDate} onChange={setSelectedDate} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : groupedMovies.length > 0 ? (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={groupedMovies}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => <MovieCard movie={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
            />
          }
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-foreground text-base font-semibold">
            Keine Filme gefunden
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-xs">
            In dieser Stadt wurden aktuell keine Vorstellungen eingepflegt.
          </Text>
        </View>
      )}
    </View>
  );
}
